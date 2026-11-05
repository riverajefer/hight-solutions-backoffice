import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus, Prisma } from '../../generated/prisma';
import { DELIVERED_ORDER_STATUSES } from '../orders/orders.repository';

/**
 * Estados que no son cartera aunque tengan saldo: un borrador todavía no es una
 * venta, y una OP anulada o devuelta ya no le debe nada a la empresa.
 */
const NOT_RECEIVABLE_STATUSES = ['ANULADO', 'DRAFT', 'RETURNED'] as const;

export interface PortfolioAgingRow {
  advisorId: string;
  bucket: string;
  orders: number;
  balance: number;
}

export interface NewClientsRow {
  advisorId: string;
  clients: number;
}

export interface TopDebtorRow {
  clientId: string;
  clientName: string;
  balance: number;
  orders: number;
  oldestOrderDate: Date;
}

/** `AND created_by_id = …` solo cuando hay asesora; si no, nada. */
const advisorSql = (advisorId?: string, column = Prisma.sql`created_by_id`) =>
  advisorId ? Prisma.sql`AND ${column} = ${advisorId}` : Prisma.empty;

@Injectable()
export class CommercialDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async canReadAllAdvisors(userId: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: {
        role: { users: { some: { id: userId } } },
        permission: { name: 'read_all_advisors_tracking' },
      },
    });
    return count > 0;
  }

  /** Cotizaciones del período por asesora y estado. Una sola consulta alimenta KPI, embudo y ranking. */
  groupQuotes(gte: Date, lte: Date, advisorId?: string) {
    return this.prisma.quote.groupBy({
      by: ['createdById', 'status'],
      where: {
        quoteDate: { gte, lte },
        ...(advisorId ? { createdById: advisorId } : {}),
      },
      _count: { _all: true },
      _sum: { total: true },
    });
  }

  /**
   * OP del período por asesora y estado. `reversedAmount` se resta del total
   * para que una OP devuelta no cuente como venta completa, igual que el
   * dashboard financiero.
   */
  groupOrders(gte: Date, lte: Date, advisorId?: string) {
    return this.prisma.order.groupBy({
      by: ['createdById', 'status'],
      where: {
        orderDate: { gte, lte },
        status: { not: OrderStatus.ANULADO },
        ...(advisorId ? { createdById: advisorId } : {}),
      },
      _count: { _all: true },
      _sum: { total: true, reversedAmount: true, balance: true },
    });
  }

  /**
   * Venta comisionable del mes: entregada y sin saldo. Es la misma regla con la
   * que «Ventas por Asesor» mide el avance de las metas, así que las dos
   * pantallas dan la misma cifra.
   */
  groupCommissionable(gte: Date, lte: Date, advisorId?: string) {
    return this.prisma.order.groupBy({
      by: ['createdById'],
      where: {
        orderDate: { gte, lte },
        status: { in: DELIVERED_ORDER_STATUSES },
        balance: { lte: 0 },
        ...(advisorId ? { createdById: advisorId } : {}),
      },
      _sum: { subtotal: true, discountAmount: true, reversedNetAmount: true },
    });
  }

  findGoals(month: number, year: number, advisorId?: string) {
    return this.prisma.salesGoal.findMany({
      where: { month, year, ...(advisorId ? { advisorId } : {}) },
      select: { advisorId: true, targetAmount: true },
    });
  }

  /**
   * Cartera a hoy por edades, contada desde la fecha de la OP. No se usa la
   * fecha de entrega porque tres de cada cuatro OP con saldo no la tienen.
   * No depende del rango de fechas: la cartera es una foto del día.
   */
  async portfolioAging(advisorId?: string): Promise<PortfolioAgingRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ advisor_id: string; bucket: string; orders: bigint; balance: string }>
    >`
      SELECT created_by_id AS advisor_id,
             CASE
               WHEN age_days <= 30 THEN '0-30'
               WHEN age_days <= 60 THEN '31-60'
               WHEN age_days <= 90 THEN '61-90'
               ELSE '90+'
             END AS bucket,
             COUNT(*) AS orders,
             COALESCE(SUM(balance), 0)::text AS balance
      FROM (
        SELECT created_by_id, balance,
               EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - order_date)) / 86400 AS age_days
        FROM orders
        WHERE balance > 0
          AND status::text NOT IN (${Prisma.join([...NOT_RECEIVABLE_STATUSES])})
          ${advisorSql(advisorId)}
      ) o
      GROUP BY 1, 2
    `;
    return rows.map((r) => ({
      advisorId: r.advisor_id,
      bucket: r.bucket,
      orders: Number(r.orders),
      balance: Number(r.balance),
    }));
  }

  /**
   * Clientes nuevos: los que hicieron su primera OP en el período. El cliente no
   * guarda quién lo creó, así que la asesora es la que hizo esa primera OP.
   */
  async newClients(gte: Date, lte: Date, advisorId?: string): Promise<NewClientsRow[]> {
    const rows = await this.prisma.$queryRaw<Array<{ advisor_id: string; clients: bigint }>>`
      SELECT created_by_id AS advisor_id, COUNT(*) AS clients
      FROM (
        SELECT DISTINCT ON (client_id) client_id, created_by_id, order_date
        FROM orders
        WHERE status::text <> 'ANULADO'
        ORDER BY client_id, order_date ASC, created_at ASC
      ) first_order
      WHERE order_date >= ${gte} AND order_date <= ${lte}
        ${advisorSql(advisorId)}
      GROUP BY 1
    `;
    return rows.map((r) => ({ advisorId: r.advisor_id, clients: Number(r.clients) }));
  }

  async topDebtors(limit: number, advisorId?: string): Promise<TopDebtorRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ client_id: string; client_name: string; balance: string; orders: bigint; oldest: Date }>
    >`
      SELECT o.client_id, c.name AS client_name,
             SUM(o.balance)::text AS balance,
             COUNT(*) AS orders,
             MIN(o.order_date) AS oldest
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      WHERE o.balance > 0
        AND o.status::text NOT IN (${Prisma.join([...NOT_RECEIVABLE_STATUSES])})
        ${advisorSql(advisorId, Prisma.sql`o.created_by_id`)}
      GROUP BY o.client_id, c.name
      ORDER BY SUM(o.balance) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      clientId: r.client_id,
      clientName: r.client_name,
      balance: Number(r.balance),
      orders: Number(r.orders),
      oldestOrderDate: r.oldest,
    }));
  }

  findUsers(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, username: true },
    });
  }

  /** Quienes han hecho alguna OP o cotización: son las opciones del filtro de asesora. */
  async findAdvisors() {
    const [fromOrders, fromQuotes] = await Promise.all([
      this.prisma.order.groupBy({ by: ['createdById'] }),
      this.prisma.quote.groupBy({ by: ['createdById'] }),
    ]);
    const ids = [
      ...new Set([...fromOrders, ...fromQuotes].map((r) => r.createdById)),
    ];
    if (ids.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, username: true, isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }
}
