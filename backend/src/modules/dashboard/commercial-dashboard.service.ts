import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus, QuoteStatus } from '../../generated/prisma';
import { businessToday, endOfDay, startOfDay } from '../../common/utils/date-range.util';
import { CommercialDashboardRepository } from './commercial-dashboard.repository';
import { CommercialQueryDto } from './dto/commercial-query.dto';

/**
 * Grupos de estado de las barras «Ventas por estado».
 *
 * No hay barra «Pagadas» por estado: en PRD casi ninguna OP pasa a `PAID`
 * (el cierre normal es `DELIVERED`). Lo cobrado se muestra dentro de cada barra,
 * medido por saldo, que es lo único que dice si una OP está pagada.
 *
 * Las barras suman lo mismo que «Ventas del período»: por eso también hay barra
 * de devueltas, aunque casi nunca tenga movimiento.
 */
export const SALES_STATUS_GROUPS: Array<{
  key: string;
  label: string;
  statuses: OrderStatus[];
}> = [
  {
    key: 'DELIVERED',
    label: 'Entregadas',
    statuses: [OrderStatus.DELIVERED, OrderStatus.DELIVERED_ON_CREDIT, OrderStatus.PAID],
  },
  { key: 'READY', label: 'Listas para entrega', statuses: [OrderStatus.READY] },
  { key: 'IN_PRODUCTION', label: 'En producción', statuses: [OrderStatus.IN_PRODUCTION] },
  { key: 'CONFIRMED', label: 'Confirmadas', statuses: [OrderStatus.CONFIRMED] },
  { key: 'WARRANTY', label: 'Garantía', statuses: [OrderStatus.WARRANTY] },
  { key: 'DRAFT', label: 'En borrador', statuses: [OrderStatus.DRAFT] },
  { key: 'RETURNED', label: 'Devueltas', statuses: [OrderStatus.RETURNED] },
];

export const AGING_BUCKETS = [
  { key: '0-30', label: '0 a 30 días' },
  { key: '31-60', label: '31 a 60 días' },
  { key: '61-90', label: '61 a 90 días' },
  { key: '90+', label: 'Más de 90 días' },
] as const;

/** Cotizaciones que siguen vivas: es la plata que todavía se puede ganar. */
const OPEN_QUOTE_STATUSES: QuoteStatus[] = [
  QuoteStatus.SENT,
  QuoteStatus.FOLLOW_UP_1,
  QuoteStatus.FOLLOW_UP_2,
  QuoteStatus.FOLLOW_UP_3,
];

const WON_QUOTE_STATUSES: QuoteStatus[] = [QuoteStatus.ACCEPTED, QuoteStatus.CONVERTED];

const TOP_DEBTORS_LIMIT = 10;

/**
 * Fecha desde la que el tablero cuenta datos (`YYYY-MM-DD`, hora Colombia).
 *
 * El cliente empezó a usar el sistema completo el 1 de agosto de 2026; lo
 * anterior se cargó a medias y no es confiable (ver la depuración de OP previas
 * a agosto). Todo el tablero se recorta a esta fecha: el periodo, la cartera,
 * los deudores y la evolución. Cuando el periodo empieza después, no hace nada.
 */
export const COMMERCIAL_DATA_START = '2026-08-01';

/** Meses de la gráfica de evolución, contando el mes en curso. */
const TREND_MONTHS = 12;

interface AdvisorAccumulator {
  salesAmount: number;
  salesOrders: number;
  quotes: number;
  quotesSent: number;
  quotesWon: number;
  portfolio: number;
  portfolioOver90: number;
  newClients: number;
  goalTarget: number | null;
  goalAchieved: number;
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

@Injectable()
export class CommercialDashboardService {
  constructor(private readonly repository: CommercialDashboardRepository) {}

  async getCommercialDashboard(query: CommercialQueryDto, userId: string) {
    const canSeeAll = await this.repository.canReadAllAdvisors(userId);

    // Pedir las cifras de otra asesora sin permiso es un error, no un recorte
    // silencioso: devolver las propias bajo el nombre ajeno sería peor.
    if (!canSeeAll && query.advisorId && query.advisorId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para ver el tablero comercial de otras asesoras',
      );
    }
    const advisorId = canSeeAll ? query.advisorId : userId;

    const { dateFrom, dateTo, requestedFrom, gte, lte } = this.resolveDateRange(query);
    const dataStart = startOfDay(COMMERCIAL_DATA_START)!;

    // La meta es mensual: se mide la del mes en que termina el período, sin
    // pasar del mes en curso. Con «Este año» el período termina en diciembre, y
    // mostrar la meta de un mes que no ha empezado no le sirve a nadie.
    const today = businessToday();
    const goalRef = dateTo < today ? dateTo : today;
    const [goalYear, goalMonth] = goalRef.split('-').map(Number);
    const goalMonthStart = startOfDay(`${goalRef.slice(0, 7)}-01`)!;
    const goalLastDay = new Date(Date.UTC(goalYear, goalMonth, 0)).getUTCDate();
    const goalMonthEnd = endOfDay(`${goalRef.slice(0, 7)}-${String(goalLastDay).padStart(2, '0')}`)!;

    // La evolución no sigue el periodo elegido: siempre son los últimos 12 meses.
    const monthlyTrendPromise = this.getMonthlyTrend(today, advisorId);

    const [quoteGroups, orderGroups, commissionable, goals, aging, newClients, topDebtors, advisors] =
      await Promise.all([
        this.repository.groupQuotes(gte, lte, advisorId),
        this.repository.groupOrders(gte, lte, advisorId),
        this.repository.groupCommissionable(goalMonthStart, goalMonthEnd, advisorId),
        this.repository.findGoals(goalMonth, goalYear, advisorId),
        this.repository.portfolioAging(dataStart, advisorId),
        this.repository.newClients(gte, lte, advisorId),
        this.repository.topDebtors(TOP_DEBTORS_LIMIT, dataStart, advisorId),
        canSeeAll ? this.repository.findAdvisors() : Promise.resolve([]),
      ]);

    // ---- Acumulado por asesora: de aquí salen el ranking y los totales ----
    const byAdvisor = new Map<string, AdvisorAccumulator>();
    const acc = (id: string) => {
      let a = byAdvisor.get(id);
      if (!a) {
        a = {
          salesAmount: 0,
          salesOrders: 0,
          quotes: 0,
          quotesSent: 0,
          quotesWon: 0,
          portfolio: 0,
          portfolioOver90: 0,
          newClients: 0,
          goalTarget: null,
          goalAchieved: 0,
        };
        byAdvisor.set(id, a);
      }
      return a;
    };

    // Cotizaciones
    const funnel = new Map<QuoteStatus, { count: number; amount: number }>();
    for (const g of quoteGroups) {
      const count = g._count._all;
      const amount = Number(g._sum.total ?? 0);
      const f = funnel.get(g.status) ?? { count: 0, amount: 0 };
      f.count += count;
      f.amount += amount;
      funnel.set(g.status, f);

      const a = acc(g.createdById);
      a.quotes += count;
      if (g.status !== QuoteStatus.DRAFT) a.quotesSent += count;
      if (WON_QUOTE_STATUSES.includes(g.status)) a.quotesWon += count;
    }

    // OP
    // La venta es la misma cifra que «Vendido» en «Ventas por Asesor»: neto sin
    // IVA (subtotal − descuentos) de toda OP no anulada, borradores incluidos.
    // El total con IVA (`gross`) solo sirve para saber qué parte está cobrada,
    // porque el saldo de la OP se lleva con IVA.
    const statusTotals = new Map<
      OrderStatus,
      { count: number; amount: number; gross: number; balance: number }
    >();
    for (const g of orderGroups) {
      const count = g._count._all;
      const amount = Number(g._sum.subtotal ?? 0) - Number(g._sum.discountAmount ?? 0);
      const gross = Number(g._sum.total ?? 0) - Number(g._sum.reversedAmount ?? 0);
      const balance = Number(g._sum.balance ?? 0);
      const s = statusTotals.get(g.status) ?? { count: 0, amount: 0, gross: 0, balance: 0 };
      s.count += count;
      s.amount += amount;
      s.gross += gross;
      s.balance += balance;
      statusTotals.set(g.status, s);

      const a = acc(g.createdById);
      a.salesAmount += amount;
      a.salesOrders += count;
    }

    // Cartera
    const agingTotals = new Map<string, { orders: number; balance: number }>();
    for (const r of aging) {
      const t = agingTotals.get(r.bucket) ?? { orders: 0, balance: 0 };
      t.orders += r.orders;
      t.balance += r.balance;
      agingTotals.set(r.bucket, t);

      const a = acc(r.advisorId);
      a.portfolio += r.balance;
      if (r.bucket === '90+') a.portfolioOver90 += r.balance;
    }

    for (const r of newClients) acc(r.advisorId).newClients += r.clients;

    // Meta
    for (const g of goals) acc(g.advisorId).goalTarget = Number(g.targetAmount);
    for (const c of commissionable) {
      acc(c.createdById).goalAchieved =
        Number(c._sum.subtotal ?? 0) -
        Number(c._sum.discountAmount ?? 0) -
        Number(c._sum.reversedNetAmount ?? 0);
    }

    // ---- Totales ----
    const all = [...byAdvisor.values()];
    const sum = (pick: (a: AdvisorAccumulator) => number) =>
      all.reduce((total, a) => total + pick(a), 0);

    const quotesCount = sum((a) => a.quotes);
    const quotesSent = sum((a) => a.quotesSent);
    const quotesWon = sum((a) => a.quotesWon);
    const salesAmount = sum((a) => a.salesAmount);
    const salesOrders = sum((a) => a.salesOrders);
    const portfolioTotal = sum((a) => a.portfolio);

    // La meta del equipo solo suma a quienes tienen meta cargada: la venta de
    // alguien sin meta inflaría el avance contra un objetivo que no la incluye.
    const withGoal = all.filter((a) => a.goalTarget !== null);
    const goalTarget = withGoal.reduce((t, a) => t + (a.goalTarget ?? 0), 0);
    const goalAchieved = withGoal.reduce((t, a) => t + a.goalAchieved, 0);

    const userIds = [...byAdvisor.keys()];
    const users = await this.repository.findUsers(userIds);
    const nameOf = new Map(users.map((u) => [u.id, this.displayName(u)]));

    return {
      // `dateFrom` es el inicio real de los cálculos; `requestedFrom`, el que pidió
      // la pantalla. Si difieren, el periodo se recortó a `dataStart`.
      period: { dateFrom, dateTo, requestedFrom, clamped: requestedFrom < dateFrom },
      dataStart: COMMERCIAL_DATA_START,
      scopedToOwn: !canSeeAll,
      advisorId: advisorId ?? null,
      advisors: advisors
        .filter((u) => u.isActive)
        .map((u) => ({ id: u.id, name: this.displayName(u) })),

      kpis: {
        quotesCount,
        quotesAmount: [...funnel.values()].reduce((t, f) => t + f.amount, 0),
        quotesSent,
        quotesWon,
        conversionRate: ratio(quotesWon, quotesSent),
        salesAmount,
        salesOrders,
        averageTicket: ratio(salesAmount, salesOrders),
        portfolioTotal,
        portfolioOrders: [...agingTotals.values()].reduce((t, b) => t + b.orders, 0),
        newClients: sum((a) => a.newClients),
      },

      salesByStatus: SALES_STATUS_GROUPS.map((group) => {
        const totals = group.statuses.reduce(
          (t, status) => {
            const s = statusTotals.get(status);
            if (s) {
              t.count += s.count;
              t.amount += s.amount;
              t.gross += s.gross;
              t.balance += s.balance;
            }
            return t;
          },
          { count: 0, amount: 0, gross: 0, balance: 0 },
        );
        // Lo cobrado se mide con IVA (como el saldo) y se lleva a la base sin IVA
        // como proporción. Un saldo negativo es saldo a favor del cliente: no hace
        // que se haya cobrado más que la venta.
        const collectedShare = Math.min(1, Math.max(0, ratio(totals.gross - totals.balance, totals.gross)));
        return {
          key: group.key,
          label: group.label,
          orders: totals.count,
          amount: totals.amount,
          collected: totals.amount * collectedShare,
        };
      }),

      portfolioAging: AGING_BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        orders: agingTotals.get(b.key)?.orders ?? 0,
        balance: agingTotals.get(b.key)?.balance ?? 0,
      })),

      quoteFunnel: {
        stages: Object.values(QuoteStatus).map((status) => ({
          status,
          count: funnel.get(status)?.count ?? 0,
          amount: funnel.get(status)?.amount ?? 0,
        })),
        openAmount: OPEN_QUOTE_STATUSES.reduce((t, s) => t + (funnel.get(s)?.amount ?? 0), 0),
        openCount: OPEN_QUOTE_STATUSES.reduce((t, s) => t + (funnel.get(s)?.count ?? 0), 0),
      },

      goal: {
        month: goalMonth,
        year: goalYear,
        hasGoal: withGoal.length > 0,
        target: goalTarget,
        achieved: goalAchieved,
        progress: ratio(goalAchieved, goalTarget),
        remaining: Math.max(0, goalTarget - goalAchieved),
      },

      // El ranking solo tiene sentido mirando al equipo completo.
      advisorRanking:
        canSeeAll && !advisorId
          ? [...byAdvisor.entries()]
              .map(([id, a]) => ({
                advisorId: id,
                advisorName: nameOf.get(id) ?? id,
                salesAmount: a.salesAmount,
                salesOrders: a.salesOrders,
                averageTicket: ratio(a.salesAmount, a.salesOrders),
                quotes: a.quotes,
                quotesWon: a.quotesWon,
                conversionRate: ratio(a.quotesWon, a.quotesSent),
                newClients: a.newClients,
                portfolio: a.portfolio,
                portfolioOver90: a.portfolioOver90,
                goalTarget: a.goalTarget,
                goalProgress: a.goalTarget ? ratio(a.goalAchieved, a.goalTarget) : null,
              }))
              // Fuera quien solo arrastra cartera vieja y no vendió ni cotizó en el período.
              .filter((r) => r.salesOrders > 0 || r.quotes > 0)
              .sort((x, y) => y.salesAmount - x.salesAmount)
          : [],

      topDebtors: topDebtors.map((d) => ({
        clientId: d.clientId,
        clientName: d.clientName,
        balance: d.balance,
        orders: d.orders,
        oldestOrderDate: d.oldestOrderDate.toISOString(),
      })),

      monthlyTrend: await monthlyTrendPromise,
    };
  }

  /**
   * Cotizado, vendido y cobrado de los últimos 12 meses (con el mes en curso),
   * más la meta de los meses que la tienen.
   *
   * No muestra meses anteriores a `COMMERCIAL_DATA_START`, así que hasta julio
   * de 2027 tiene menos de 12. Se quitan además los meses vacíos del principio;
   * los vacíos del medio se dejan, porque un mes sin ventas sí es información.
   */
  async getMonthlyTrend(today: string, advisorId?: string) {
    const [year, month] = today.split('-').map(Number);
    const months: string[] = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(year, month - 1 - i, 1));
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (ym >= COMMERCIAL_DATA_START.slice(0, 7)) months.push(ym);
    }
    const [firstYear, firstMonth] = months[0].split('-').map(Number);
    const since = startOfDay(`${months[0]}-01`)!;

    const [quoted, sold, collected, goals, byClientType] = await Promise.all([
      this.repository.monthlyQuoted(since, advisorId),
      this.repository.monthlySold(since, advisorId),
      this.repository.monthlyCollected(since, advisorId),
      this.repository.findGoalsSince(firstYear, firstMonth, advisorId),
      this.repository.monthlyByClientType(since, advisorId),
    ]);
    const clientTypeBy = new Map(byClientType.map((r) => [r.month, r]));

    const index = (rows: Array<{ month: string; amount: number }>) =>
      new Map(rows.map((r) => [r.month, r.amount]));
    const quotedBy = index(quoted);
    const soldBy = index(sold);
    const collectedBy = index(collected);
    const goalBy = new Map<string, number>();
    for (const g of goals) {
      const key = `${g.year}-${String(g.month).padStart(2, '0')}`;
      goalBy.set(key, (goalBy.get(key) ?? 0) + Number(g.targetAmount));
    }

    const series = months.map((m) => ({
      month: m,
      quoted: quotedBy.get(m) ?? 0,
      sold: soldBy.get(m) ?? 0,
      collected: collectedBy.get(m) ?? 0,
      // null y no 0: sin meta cargada la línea se corta en vez de caer a cero.
      goal: goalBy.has(m) ? goalBy.get(m)! : null,
      // Venta del mes partida por tipo de cliente; las dos suman `sold`.
      newClientSales: clientTypeBy.get(m)?.newAmount ?? 0,
      recurringClientSales: clientTypeBy.get(m)?.recurringAmount ?? 0,
      newClients: clientTypeBy.get(m)?.newClients ?? 0,
      recurringClients: clientTypeBy.get(m)?.recurringClients ?? 0,
      // El mes en curso apenas empieza: la gráfica lo marca para que su caída no se lea como mala noticia.
      inProgress: m === months[months.length - 1],
    }));

    const firstWithData = series.findIndex(
      (s) => s.quoted > 0 || s.sold > 0 || s.collected > 0 || s.goal !== null,
    );
    return firstWithData === -1 ? series.slice(-1) : series.slice(firstWithData);
  }

  private displayName(u: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  }) {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username || u.id;
  }

  /** Mismo criterio que el dashboard financiero: hora Colombia y, por defecto, el mes en curso. */
  private resolveDateRange(query: CommercialQueryDto) {
    const range = this.requestedDateRange(query);
    // Nada antes del inicio de datos. Si todo el periodo queda antes, `gte`
    // pasa a ser mayor que `lte` y las consultas salen vacías, que es lo correcto.
    const dateFrom = range.dateFrom < COMMERCIAL_DATA_START ? COMMERCIAL_DATA_START : range.dateFrom;
    return {
      dateFrom,
      dateTo: range.dateTo,
      requestedFrom: range.dateFrom,
      gte: startOfDay(dateFrom)!,
      lte: endOfDay(range.dateTo)!,
    };
  }

  private requestedDateRange(query: CommercialQueryDto) {
    let dateFrom = query.dateFrom?.slice(0, 10);
    let dateTo = query.dateTo?.slice(0, 10);

    if (!dateFrom || !dateTo) {
      const [year, month] = businessToday().split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const mm = String(month).padStart(2, '0');
      dateFrom = `${year}-${mm}-01`;
      dateTo = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
    }

    return { dateFrom, dateTo };
  }
}
