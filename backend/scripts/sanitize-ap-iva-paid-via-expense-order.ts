/**
 * Saneamiento de Cuentas por Pagar espejo que quedaron con el IVA de su Orden de
 * Gasto como saldo pendiente, aunque Caja ya lo había entregado.
 *
 * Contexto
 * --------
 * Hasta el 2026-10-19, `ExpenseOrdersService.cajaAuthorize` registraba cada
 * egreso de caja con la base del ítem (`item.total`, sin IVA ni retenciones),
 * mientras la OG le mostraba a Caja el total con IVA y Caja entregaba ese total.
 * `AccountsPayableService.settleFromExpenseOrderMovements` reflejaba esos
 * egresos como abonos de la CP espejo, así que la CP quedaba PARTIAL u OVERDUE
 * con saldo = IVA − retenciones: una deuda que no existe. El código ya reparte
 * el total entre los ítems (`allocateExpenseTotalToItems`); este script se
 * ocupa de lo que quedó atrás.
 *
 * Fase 1 — la Cuenta por Pagar
 * ----------------------------
 * A cada CP que califica le registra un abono de ajuste por el saldo exacto
 * (uno por método de pago de los egresos de la OG), sin movimiento de caja, con
 * referencia `AJUSTE-IVA-<OG>` y una nota que dice de dónde sale. Luego
 * recalcula `paidAmount`, `balance` y `status` desde los abonos vivos: la CP
 * queda PAID con saldo $0.
 *
 * Fase 2 — la caja
 * ----------------
 * El IVA pagado en efectivo salió del cajón sin asiento: cada arqueo con una de
 * esas OG quedó corto. La fase 2 le da a cada abono de ajuste en EFECTIVO su
 * egreso de caja, en sesiones de ajuste de la caja «Ajustes Históricos» (la
 * misma de `sanitize-historic-orphan-payments.ts`):
 *
 * - **No se reabre ni se toca ninguna sesión original.** Sus arqueos firmados
 *   quedan iguales; el faltante queda explicado en un asiento aparte.
 * - Una sesión por mes (hora de Colombia) del egreso original, **nacida
 *   CERRADA**: una abierta sería tomada por `findFirst({ status: 'OPEN' })` y se
 *   llevaría los movimientos nuevos. `openingAmount = 0`,
 *   `closingAmount = systemBalance = −egresos`, `discrepancy = 0`: es un asiento
 *   contable, no un conteo físico.
 * - Cada egreso queda vinculado a su abono de ajuste (`cashMovementId`), con
 *   `referenceType = 'ACCOUNT_PAYABLE'` como cualquier pago de CP. Nunca
 *   `EXPENSE_ORDER`: `settleFromExpenseOrderMovements` y
 *   `sanitize-ap-paid-via-expense-order.ts` lo tomarían como un egreso de la OG
 *   y lo sumarían otra vez a la CP.
 * - Recibos `AJU-YYYY-NNNNN`, continuando la secuencia `AJU-` que ya exista,
 *   para no consumir la real `RC-`.
 * - Las transferencias no tienen fase 2: no pasan por el cajón.
 *
 * Qué califica
 * ------------
 * - OG en `PAID` y CP que no está ni `PAID` ni `CANCELLED`.
 * - La CP no es anticipo de nómina (ahí `paidAmount` se descuenta al empleado).
 * - La OG lleva IVA. Sin IVA, un saldo de centavos es residuo del redondeo a
 *   peso entero, no IVA entregado: va con las CP atrapadas por centavos.
 * - Todos sus abonos vivos son reflejo de egresos de la OG (`cashMovementId` de
 *   un movimiento `EXPENSE_ORDER`) y todos esos egresos ya están reflejados.
 * - Los egresos suman la base de la OG (suma de `item.total`): es la firma del
 *   bug. Si suman otra cosa, la OG se pagó distinto y no se adivina.
 * - El saldo de la CP es su total menos los egresos, y es positivo.
 * - El total de la CP coincide con el total de la OG (`computeExpenseTotals`).
 *   Se admite una diferencia menor a $1: las CP viejas guardaban el total con
 *   centavos y la OG ya redondea a peso entero. Esas se reportan aparte y el
 *   ajuste es por el saldo exacto de la CP, centavos incluidos.
 *
 * Todo lo demás se lista con su motivo y no se toca.
 *
 * Uso
 * ---
 *   npx ts-node scripts/sanitize-ap-iva-paid-via-expense-order.ts                     # dry-run sobre .env.development
 *   npx ts-node scripts/sanitize-ap-iva-paid-via-expense-order.ts --env=production    # dry-run en PRD
 *   npx ts-node scripts/sanitize-ap-iva-paid-via-expense-order.ts --env=production --ap=CP-2026-196 --apply
 *   npx ts-node scripts/sanitize-ap-iva-paid-via-expense-order.ts --env=production --apply
 *
 * Opciones
 *   --apply         escribe (por defecto solo simula)
 *   --fase=1|2      corre solo esa fase (por defecto las dos, en orden)
 *   --ap=<numero>   limita a una sola CP, para probar el efecto en un caso
 *   --env=<nombre>  archivo .env.<nombre> del que leer DATABASE_URL
 *   --detalle       lista todas las CP a sanear, no solo una muestra
 *
 * Es idempotente. Fase 1: una CP saneada queda PAID y deja de calificar; y
 * aunque volviera a calificar, su abono de ajuste no es reflejo de un egreso de
 * la OG, así que una segunda corrida la vería con abonos propios y la saltaría.
 * Fase 2: solo toma abonos de ajuste en efectivo sin `cashMovementId`.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma, AccountPayableStatus, PaymentMethod } from '../src/generated/prisma';
import {
  allocateExpenseTotalToItems,
  computeExpenseTotals,
} from '../src/common/utils/expense-totals.util';

const APPLY = process.argv.includes('--apply');
const DETALLE = process.argv.includes('--detalle');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const ONLY_AP = process.argv.find((a) => a.startsWith('--ap='))?.split('=')[1];
const FASE = process.argv.find((a) => a.startsWith('--fase='))?.split('=')[1];
if (FASE && FASE !== '1' && FASE !== '2') {
  console.error('❌ --fase debe ser 1 o 2');
  process.exit(1);
}

const REFERENCIA_PREFIJO = 'AJUSTE-IVA-';

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    console.log(`Usando DATABASE_URL del entorno (no se lee .env.${ENV}).`);
    return process.env.DATABASE_URL;
  }
  const envPath = path.resolve(__dirname, '..', `.env.${ENV}`);
  if (!fs.existsSync(envPath)) {
    console.error(`❌ No se encontró ${envPath}`);
    process.exit(1);
  }
  // Mismo parseo que `db-query.sh`: `.env.production` entrecomilla con comillas
  // simples y deja un espacio al final.
  const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  const url = match[1].trim().replace(/^['"]/, '').replace(/['"]$/, '').trim();
  if (!url) {
    console.error(`❌ ${envPath} define DATABASE_URL vacío`);
    process.exit(1);
  }
  return url;
}

// En dry-run la sesión se abre en solo lectura, igual que `db-query.sh`: aunque
// un cambio futuro del script intentara escribir sin `--apply`, el motor lo
// rechazaría. Así correr el dry-run contra producción no tiene riesgo.
const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  max: 2,
  ...(!APPLY && { options: '-c default_transaction_read_only=on' }),
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ZERO = new Prisma.Decimal(0);
const cents = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v).toDecimalPlaces(2);
const sum = <T>(lista: T[], campo: (x: T) => Prisma.Decimal.Value) =>
  lista.reduce((acc, x) => acc.add(campo(x)), ZERO);

const money = (v: Prisma.Decimal.Value) =>
  Number(String(v)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  });

type Movimiento = {
  id: string;
  amount: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  performedById: string;
  receiptNumber: string;
  reflejado: boolean;
  sesion: { id: string; status: string; openedAt: Date; caja: string };
  /** IVA − retenciones que le tocaba a este egreso y no se registró. */
  faltante: Prisma.Decimal;
};

type Ajuste = { paymentMethod: PaymentMethod; amount: Prisma.Decimal };

type Caso = {
  id: string;
  apNumber: string;
  ogNumber: string;
  status: AccountPayableStatus;
  totalAmount: Prisma.Decimal;
  balance: Prisma.Decimal;
  ogTotal: number;
  paymentDate: Date;
  registeredById: string;
  movimientos: Movimiento[];
  ajustes: Ajuste[];
  conCentavos: boolean;
  motivoExclusion?: string;
};

async function recolectar(): Promise<Caso[]> {
  const cuentas = await prisma.accountPayable.findMany({
    where: {
      expenseOrder: { status: 'PAID' },
      status: { notIn: [AccountPayableStatus.PAID, AccountPayableStatus.CANCELLED] },
      ...(ONLY_AP && { apNumber: ONLY_AP }),
    },
    select: {
      id: true,
      apNumber: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      balance: true,
      beneficiaryUserId: true,
      payrollPeriodId: true,
      expenseOrder: {
        select: {
          id: true,
          ogNumber: true,
          applyIva: true,
          ivaRate: true,
          retefuenteRate: true,
          reteICARate: true,
          reteIVARate: true,
          cajaAuthorizedAt: true,
          cajaAuthorizedById: true,
          items: { select: { total: true } },
        },
      },
      payments: {
        where: { isReversed: false },
        select: { cashMovement: { select: { referenceType: true } } },
      },
    },
    orderBy: { apNumber: 'asc' },
  });

  const casos: Caso[] = [];

  for (const ap of cuentas) {
    const og = ap.expenseOrder!;
    const filas = await prisma.cashMovement.findMany({
      where: {
        referenceType: 'EXPENSE_ORDER',
        referenceId: og.id,
        movementType: 'EXPENSE',
        isVoided: false,
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        performedById: true,
        receiptNumber: true,
        accountPayablePayment: { select: { id: true } },
        cashSession: {
          select: {
            id: true,
            status: true,
            openedAt: true,
            cashRegister: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Lo que le tocaba a cada egreso con la regla nueva, menos lo que se
    // registró: es el IVA (− retenciones) que salió del cajón sin asiento.
    const partes = allocateExpenseTotalToItems(
      filas.map((m) => Number(m.amount)),
      og,
    );
    const movimientos: Movimiento[] = filas.map((m, i) => ({
      id: m.id,
      amount: new Prisma.Decimal(m.amount),
      paymentMethod: m.paymentMethod,
      createdAt: m.createdAt,
      performedById: m.performedById,
      receiptNumber: m.receiptNumber,
      reflejado: m.accountPayablePayment !== null,
      sesion: {
        id: m.cashSession.id,
        status: m.cashSession.status,
        openedAt: m.cashSession.openedAt,
        caja: m.cashSession.cashRegister.name,
      },
      faltante: cents(new Prisma.Decimal(partes[i]).sub(m.amount)),
    }));

    const base = sum(og.items, (i) => i.total);
    const ogTotal = computeExpenseTotals(Number(base), og).total;
    const girado = sum(movimientos, (m) => m.amount);
    const totalAmount = new Prisma.Decimal(ap.totalAmount);
    const balance = new Prisma.Decimal(ap.balance);
    const diferenciaTotal = totalAmount.sub(ogTotal).abs();

    let motivoExclusion: string | undefined;
    if (ap.beneficiaryUserId || ap.payrollPeriodId) {
      motivoExclusion = 'anticipo de nómina: paidAmount se descuenta al empleado';
    } else if (!og.applyIva) {
      // Sin IVA el saldo no es IVA entregado: es el residuo de redondear a peso
      // entero una base con centavos. Se resuelve con las CP atrapadas por
      // centavos, no aquí.
      motivoExclusion = 'la OG no lleva IVA: el saldo es residuo de redondeo, no IVA';
    } else if (ap.payments.some((p) => p.cashMovement?.referenceType !== 'EXPENSE_ORDER')) {
      motivoExclusion = 'tiene abonos propios además del giro de la OG (¿IVA pagado aparte?)';
    } else if (movimientos.length === 0) {
      motivoExclusion = 'la OG no tiene egresos de caja vivos';
    } else if (movimientos.some((m) => !m.reflejado)) {
      motivoExclusion =
        'egresos de la OG sin reflejar: correr antes sanitize-ap-paid-via-expense-order.ts';
    } else if (!cents(girado).equals(cents(base))) {
      motivoExclusion = `los egresos (${money(girado)}) no suman la base de la OG (${money(base)})`;
    } else if (!cents(ap.paidAmount).equals(cents(girado))) {
      motivoExclusion = `paidAmount (${money(ap.paidAmount)}) distinto de los egresos (${money(girado)})`;
    } else if (!balance.equals(totalAmount.sub(ap.paidAmount))) {
      motivoExclusion = `saldo (${money(balance)}) distinto de total − pagado`;
    } else if (diferenciaTotal.greaterThanOrEqualTo(1)) {
      motivoExclusion = `total de la CP (${money(totalAmount)}) distinto del de la OG (${money(ogTotal)})`;
    } else if (balance.lessThanOrEqualTo(0)) {
      motivoExclusion = 'saldo no positivo';
    }

    // Un abono de ajuste por método de pago. El faltante por egreso suma
    // `ogTotal − base`; el saldo de la CP es `totalAmount − base`. Difieren en
    // menos de $1 en las CP con centavos: esa diferencia la absorbe el método
    // con más faltante, para que el ajuste deje el saldo exactamente en $0.
    const porMetodo = new Map<PaymentMethod, Prisma.Decimal>();
    for (const m of movimientos) {
      porMetodo.set(m.paymentMethod, (porMetodo.get(m.paymentMethod) ?? ZERO).add(m.faltante));
    }
    const ajustes: Ajuste[] = [...porMetodo.entries()]
      .map(([paymentMethod, amount]) => ({ paymentMethod, amount }))
      .sort((a, b) => b.amount.comparedTo(a.amount));
    if (ajustes.length > 0) {
      const resto = balance.sub(sum(ajustes, (a) => a.amount));
      ajustes[0].amount = ajustes[0].amount.add(resto);
    }
    if (!motivoExclusion && ajustes.some((a) => a.amount.lessThanOrEqualTo(0))) {
      motivoExclusion = 'el reparto del saldo por método de pago da un abono no positivo';
    }

    casos.push({
      id: ap.id,
      apNumber: ap.apNumber,
      ogNumber: og.ogNumber,
      status: ap.status,
      totalAmount,
      balance,
      ogTotal,
      paymentDate: og.cajaAuthorizedAt ?? movimientos[0]?.createdAt ?? new Date(),
      registeredById: og.cajaAuthorizedById ?? movimientos[0]?.performedById ?? '',
      movimientos,
      ajustes,
      conCentavos: !totalAmount.equals(ogTotal),
      motivoExclusion,
    });
  }

  return casos;
}

/** Registra los abonos de ajuste y deja la CP en PAID. */
async function sanear(caso: Caso): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // La CP pudo cambiar entre el dry-run y aquí (alguien la pagó o la anuló).
      const actual = await tx.accountPayable.findUniqueOrThrow({
        where: { id: caso.id },
        select: { status: true, balance: true },
      });
      if (
        actual.status === AccountPayableStatus.PAID ||
        actual.status === AccountPayableStatus.CANCELLED ||
        !new Prisma.Decimal(actual.balance).equals(caso.balance)
      ) {
        throw new Error(
          `cambió desde la lectura (estado ${actual.status}, saldo ${money(actual.balance)})`,
        );
      }

      const recibos = caso.movimientos.map((m) => m.receiptNumber).join(', ');
      for (const ajuste of caso.ajustes) {
        await tx.accountPayablePayment.create({
          data: {
            accountPayableId: caso.id,
            amount: ajuste.amount,
            paymentMethod: ajuste.paymentMethod,
            paymentDate: caso.paymentDate,
            reference: `${REFERENCIA_PREFIJO}${caso.ogNumber}`,
            notes:
              `Saneamiento 2026-10: IVA entregado por Caja al autorizar la Orden de Gasto ` +
              `${caso.ogNumber}. El egreso de esa autorización (${recibos}) se registró ` +
              'solo por la base del ítem, sin IVA; este abono refleja la diferencia para ' +
              'que la cuenta no aparezca debiendo lo que ya se pagó. No tiene movimiento ' +
              'de caja asociado.',
            registeredById: caso.registeredById,
          },
        });
      }

      const vivos = await tx.accountPayablePayment.findMany({
        where: { accountPayableId: caso.id, isReversed: false },
        select: { amount: true },
      });
      const paidAmount = sum(vivos, (p) => p.amount);
      const balance = caso.totalAmount.sub(paidAmount);
      if (!balance.equals(0)) {
        throw new Error(`el saldo quedaría en ${money(balance)} y no en $0`);
      }

      await tx.accountPayable.update({
        where: { id: caso.id },
        data: { paidAmount, balance, status: AccountPayableStatus.PAID },
      });
    },
    { timeout: 30_000, maxWait: 30_000 },
  );
}

function imprimirEfectivoPorSesion(saneables: Caso[]) {
  type Fila = { caja: string; openedAt: Date; status: string; monto: Prisma.Decimal; ogs: Set<string> };
  const porSesion = new Map<string, Fila>();
  for (const c of saneables) {
    for (const m of c.movimientos) {
      if (m.paymentMethod !== PaymentMethod.CASH || m.faltante.lessThanOrEqualTo(0)) continue;
      const fila = porSesion.get(m.sesion.id) ?? {
        caja: m.sesion.caja,
        openedAt: m.sesion.openedAt,
        status: m.sesion.status,
        monto: ZERO,
        ogs: new Set<string>(),
      };
      fila.monto = fila.monto.add(m.faltante);
      fila.ogs.add(c.ogNumber);
      porSesion.set(m.sesion.id, fila);
    }
  }
  const filas = [...porSesion.values()].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  if (filas.length === 0) return;

  console.log('\nIVA en EFECTIVO que salió del cajón sin egreso registrado, por sesión original');
  console.log('(esas sesiones no se tocan; la fase 2 asienta el faltante en «Ajustes Históricos»):');
  for (const f of filas) {
    console.log(
      `  ${f.openedAt.toISOString().slice(0, 10)}  ${f.caja.padEnd(18)} ${f.status.padEnd(7)} ` +
        `${money(f.monto).padStart(14)}  (${f.ogs.size} OG)`,
    );
  }
  const cerradas = filas.filter((f) => f.status === 'CLOSED');
  const abiertas = filas.filter((f) => f.status !== 'CLOSED');
  console.log(
    `  Total: ${money(sum(filas, (f) => f.monto))} en ${filas.length} sesiones — ` +
      `cerradas ${money(sum(cerradas, (f) => f.monto))} (${cerradas.length}), ` +
      `abiertas ${money(sum(abiertas, (f) => f.monto))} (${abiertas.length})`,
  );
}

/**
 * Fase 1. Devuelve los abonos de ajuste en efectivo que el dry-run crearía, para
 * que la fase 2 los pueda proyectar sin que existan todavía.
 */
async function fase1(): Promise<AsientoCaja[]> {
  console.log('══ Fase 1: abonos de ajuste en las Cuentas por Pagar ══\n');

  const casos = await recolectar();
  if (casos.length === 0) {
    console.log('No hay cuentas candidatas. Nada que hacer.');
    return [];
  }

  const excluidas = casos.filter((c) => c.motivoExclusion);
  const saneables = casos.filter((c) => !c.motivoExclusion);
  const exactas = saneables.filter((c) => !c.conCentavos);
  const conCentavos = saneables.filter((c) => c.conCentavos);

  console.log(`Candidatas (OG pagada, CP no pagada ni anulada): ${casos.length}`);
  console.log('A sanear (quedan PAID):');
  console.log(
    `  ${String(exactas.length).padStart(4)} CP con total igual al de la OG       ` +
      `${money(sum(exactas, (c) => c.balance)).padStart(16)}`,
  );
  console.log(
    `  ${String(conCentavos.length).padStart(4)} CP con total en centavos (dif. < $1) ` +
      `${money(sum(conCentavos, (c) => c.balance)).padStart(16)}`,
  );
  for (const estado of [AccountPayableStatus.PARTIAL, AccountPayableStatus.OVERDUE]) {
    const lista = saneables.filter((c) => c.status === estado);
    if (lista.length > 0) {
      console.log(`       de ellas ${estado.padEnd(8)} ${String(lista.length).padStart(4)}  ${money(sum(lista, (c) => c.balance))}`);
    }
  }
  const ajustes = saneables.flatMap((c) => c.ajustes);
  for (const metodo of new Set(ajustes.map((a) => a.paymentMethod))) {
    const lista = ajustes.filter((a) => a.paymentMethod === metodo);
    console.log(`       abonos ${metodo.padEnd(10)} ${String(lista.length).padStart(4)}  ${money(sum(lista, (a) => a.amount))}`);
  }

  if (excluidas.length > 0) {
    console.log(`\n⚠️  NO se tocan (${excluidas.length}):`);
    for (const c of excluidas) {
      console.log(
        `     ${c.apNumber.padEnd(13)} ${c.ogNumber}  ${c.status.padEnd(8)} saldo ${money(c.balance).padStart(14)}  — ${c.motivoExclusion}`,
      );
    }
  }

  imprimirEfectivoPorSesion(saneables);

  if (!APPLY) {
    const muestra = DETALLE ? saneables : saneables.slice(0, 10);
    if (muestra.length > 0) console.log(`\n${DETALLE ? 'Todas las' : 'Muestra de las primeras 10'} a sanear:`);
    for (const c of muestra) {
      console.log(
        `  ${c.apNumber.padEnd(13)} ${c.ogNumber}  ${c.status.padEnd(8)} → PAID  ` +
          `total ${money(c.totalAmount).padStart(14)}  ajuste ` +
          c.ajustes.map((a) => `${money(a.amount)} ${a.paymentMethod}`).join(' + '),
      );
    }
    return saneables.flatMap((c) =>
      c.ajustes
        .filter((a) => a.paymentMethod === PaymentMethod.CASH)
        .map((a) => ({
          apNumber: c.apNumber,
          ogNumber: c.ogNumber,
          amount: a.amount,
          paymentDate: c.paymentDate,
          registeredById: c.registeredById,
          egresos: c.movimientos
            .filter((m) => m.paymentMethod === PaymentMethod.CASH)
            .map((m) => ({ receiptNumber: m.receiptNumber, sesionAbierta: m.sesion.openedAt })),
        })),
    );
  }

  // ── Aplicar ────────────────────────────────────────────────────────────────

  let ok = 0;
  const fallidas: string[] = [];
  for (const caso of saneables) {
    try {
      await sanear(caso);
      ok++;
      console.log(`  ✔ ${caso.apNumber}  ${money(caso.balance).padStart(14)}  → PAID`);
    } catch (error: any) {
      fallidas.push(caso.apNumber);
      console.error(`  ✘ ${caso.apNumber}: ${error?.message ?? error}`);
    }
  }

  console.log(`\n${ok} de ${saneables.length} cuentas saneadas.`);
  if (fallidas.length > 0) {
    console.log(
      `${fallidas.length} fallaron. Cada CP va en su propia transacción, así que las que ` +
        'fallaron quedaron intactas: se puede volver a correr el script.',
    );
  }
  // Con --apply la fase 2 lee de la base los abonos que se acaban de crear.
  return [];
}

// ── Fase 2: egresos en sesiones de ajuste ────────────────────────────────────

/** Caja contable compartida con `sanitize-historic-orphan-payments.ts`. */
const ADJUSTMENT_REGISTER_NAME = 'Ajustes Históricos';
/** Prefijo propio para no consumir la secuencia real de recibos (`RC-`). */
const RECEIPT_PREFIX = 'AJU';
/** Colombia no tiene horario de verano: siempre UTC−5. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

type AsientoCaja = {
  /** Ausente cuando el abono solo existe en el dry-run de la fase 1. */
  paymentId?: string;
  apId?: string;
  apNumber: string;
  ogNumber: string;
  amount: Prisma.Decimal;
  paymentDate: Date;
  registeredById: string;
  egresos: Array<{ receiptNumber: string; sesionAbierta: Date }>;
};

const mesBogota = (date: Date) => {
  const local = new Date(date.getTime() - BOGOTA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Último segundo del mes (hora de Colombia), o ahora si el mes no ha terminado. */
const cierreDelMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number);
  const fin = new Date(Date.UTC(y, m, 1) + BOGOTA_OFFSET_MS - 1000);
  return fin.getTime() > Date.now() ? new Date() : fin;
};

const fechaBogota = (date: Date) =>
  new Date(date.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);

/** Abonos de ajuste en efectivo que todavía no tienen su egreso de caja. */
async function asientosPendientes(): Promise<AsientoCaja[]> {
  const pagos = await prisma.accountPayablePayment.findMany({
    where: {
      reference: { startsWith: REFERENCIA_PREFIJO },
      paymentMethod: PaymentMethod.CASH,
      cashMovementId: null,
      isReversed: false,
      accountPayable: {
        status: { not: AccountPayableStatus.CANCELLED },
        ...(ONLY_AP && { apNumber: ONLY_AP }),
      },
    },
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      registeredById: true,
      accountPayable: {
        select: {
          id: true,
          apNumber: true,
          expenseOrder: { select: { id: true, ogNumber: true } },
        },
      },
    },
    orderBy: { paymentDate: 'asc' },
  });
  if (pagos.length === 0) return [];

  const ogIds = pagos.map((p) => p.accountPayable.expenseOrder?.id).filter(Boolean) as string[];
  const originales = await prisma.cashMovement.findMany({
    where: {
      referenceType: 'EXPENSE_ORDER',
      referenceId: { in: ogIds },
      movementType: 'EXPENSE',
      paymentMethod: PaymentMethod.CASH,
      isVoided: false,
    },
    select: { referenceId: true, receiptNumber: true, cashSession: { select: { openedAt: true } } },
  });

  return pagos.map((p) => ({
    paymentId: p.id,
    apId: p.accountPayable.id,
    apNumber: p.accountPayable.apNumber,
    ogNumber: p.accountPayable.expenseOrder?.ogNumber ?? '(sin OG)',
    amount: new Prisma.Decimal(p.amount),
    paymentDate: p.paymentDate,
    registeredById: p.registeredById,
    egresos: originales
      .filter((m) => m.referenceId === p.accountPayable.expenseOrder?.id)
      .map((m) => ({ receiptNumber: m.receiptNumber, sesionAbierta: m.cashSession.openedAt })),
  }));
}

function descripcion(a: AsientoCaja): string {
  const egresos = a.egresos
    .map((e) => `${e.receiptNumber} de la sesión del ${fechaBogota(e.sesionAbierta)}`)
    .join(', ');
  return (
    `Ajuste IVA — Pago Cuenta por Pagar ${a.apNumber} (${a.ogNumber}): IVA entregado en ` +
    `efectivo al autorizar la OG y no incluido en su egreso${egresos ? ` (${egresos})` : ''}`
  );
}

/** Siguiente número `AJU-<año>-NNNNN`, continuando lo que ya exista en la base. */
async function crearNumerador() {
  const ultimos = new Map<number, number>();
  return async (year: number) => {
    if (!ultimos.has(year)) {
      const ultimo = await prisma.cashMovement.findFirst({
        where: { receiptNumber: { startsWith: `${RECEIPT_PREFIX}-${year}-` } },
        orderBy: { receiptNumber: 'desc' },
        select: { receiptNumber: true },
      });
      ultimos.set(year, ultimo ? Number(ultimo.receiptNumber.split('-')[2]) : 0);
    }
    const siguiente = ultimos.get(year)! + 1;
    ultimos.set(year, siguiente);
    return `${RECEIPT_PREFIX}-${year}-${String(siguiente).padStart(5, '0')}`;
  };
}

async function fase2(planeados: AsientoCaja[]) {
  console.log('\n══ Fase 2: egresos de caja en sesiones de ajuste cerradas ══\n');

  const existentes = await asientosPendientes();
  const asientos = [...existentes, ...planeados];
  if (asientos.length === 0) {
    console.log('No hay abonos de ajuste en efectivo sin egreso de caja. Nada que hacer.');
    return;
  }
  if (planeados.length > 0) {
    console.log(
      `${existentes.length} abonos ya existen sin egreso; ${planeados.length} los crearía la fase 1.`,
    );
  }

  const porMes = new Map<string, AsientoCaja[]>();
  for (const a of asientos) {
    const mes = mesBogota(a.paymentDate);
    porMes.set(mes, [...(porMes.get(mes) ?? []), a]);
  }
  const meses = [...porMes.keys()].sort();

  console.log('Una sesión CERRADA por mes en la caja «Ajustes Históricos»:');
  for (const mes of meses) {
    const lista = porMes.get(mes)!;
    console.log(
      `  ${mes}  cierre ${cierreDelMes(mes).toISOString()}  ${String(lista.length).padStart(4)} egresos  ` +
        `${money(sum(lista, (a) => a.amount)).padStart(16)}`,
    );
  }
  console.log(
    `  TOTAL   ${String(asientos.length).padStart(36)} egresos  ${money(sum(asientos, (a) => a.amount)).padStart(16)}`,
  );

  if (!APPLY) {
    const ejemplo = asientos[0];
    console.log(`\nEjemplo de descripción del egreso:\n  ${descripcion(ejemplo)}`);
    return;
  }

  // ── Aplicar ────────────────────────────────────────────────────────────────

  const register = await prisma.cashRegister.upsert({
    where: { name: ADJUSTMENT_REGISTER_NAME },
    create: {
      name: ADJUSTMENT_REGISTER_NAME,
      description:
        'Caja contable para asientos de corrección. No corresponde a dinero ' +
        'contado físicamente.',
      // Inactiva: nadie debe abrir sesiones operativas aquí.
      isActive: false,
    },
    update: {},
  });
  console.log(`\nCaja de ajustes: ${register.name} (${register.id})`);

  // Responsable de las sesiones: quien más autorizó esas OG en Caja.
  const conteo = new Map<string, number>();
  for (const a of asientos) conteo.set(a.registeredById, (conteo.get(a.registeredById) ?? 0) + 1);
  const responsableId = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const siguienteRecibo = await crearNumerador();
  let creados = 0;

  for (const mes of meses) {
    const lista = porMes.get(mes)!;
    const suma = sum(lista, (a) => a.amount);
    const cierre = cierreDelMes(mes);

    // Recibos fuera de la transacción: si el mes falla, quedan huecos en la
    // numeración `AJU-`, que es solo de ajustes y no le importa a nadie.
    const movimientos: Array<
      Omit<Prisma.CashMovementCreateManyInput, 'cashSessionId'> & {
        id: string;
        paymentId: string;
      }
    > = [];
    for (const a of lista) {
      movimientos.push({
        id: randomUUID(),
        paymentId: a.paymentId!,
        receiptNumber: await siguienteRecibo(cierre.getUTCFullYear()),
        movementType: 'EXPENSE' as const,
        paymentMethod: PaymentMethod.CASH,
        amount: a.amount,
        description: descripcion(a),
        referenceType: 'ACCOUNT_PAYABLE',
        referenceId: a.apId!,
        performedById: a.registeredById,
        createdAt: cierre,
      });
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const session = await tx.cashSession.create({
            data: {
              cashRegisterId: register.id,
              openedById: responsableId,
              closedById: responsableId,
              status: 'CLOSED',
              openingAmount: ZERO,
              // Solo egresos: el saldo del sistema es negativo. Se declara el
              // cierre igual a él porque es un asiento, no un conteo físico.
              closingAmount: suma.neg(),
              systemBalance: suma.neg(),
              discrepancy: ZERO,
              openedAt: cierre,
              closedAt: cierre,
              notes:
                `Ajuste IVA de Órdenes de Gasto ${mes}: ${lista.length} egresos en efectivo ` +
                'por el IVA que Caja entregó al autorizar OG y que el sistema registró sin ' +
                'IVA (saneamiento 2026-10). Explica faltantes de los arqueos de la Caja ' +
                'Principal de ese mes. No corresponde a un arqueo físico.',
            },
          });

          await tx.cashMovement.createMany({
            data: movimientos.map(({ paymentId, ...m }) => ({ ...m, cashSessionId: session.id })),
          });

          // Se enlaza solo si el abono sigue vivo y sin movimiento: si alguien lo
          // revirtió o ya lo enlazó entre la lectura y aquí, el mes se revierte.
          const pares = Prisma.join(
            movimientos.map((m) => Prisma.sql`(${m.paymentId}, ${m.id})`),
          );
          const enlazados = await tx.$executeRaw`
            UPDATE account_payable_payments AS p
            SET cash_movement_id = v.mov_id
            FROM (VALUES ${pares}) AS v(pay_id, mov_id)
            WHERE p.id = v.pay_id AND p.cash_movement_id IS NULL AND NOT p.is_reversed
          `;
          if (enlazados !== movimientos.length) {
            throw new Error(
              `solo ${enlazados} de ${movimientos.length} abonos seguían sin egreso; se revierte el mes`,
            );
          }
        },
        { timeout: 120_000, maxWait: 30_000 },
      );
      creados += movimientos.length;
      console.log(
        `  ✔ ${mes}  ${movimientos.length} egresos  ${money(suma)}  ` +
          `(${movimientos[0].receiptNumber} … ${movimientos[movimientos.length - 1].receiptNumber})`,
      );
    } catch (error: any) {
      console.error(`  ✘ ${mes}: ${error?.message ?? error}`);
    }
  }

  console.log(`\n${creados} de ${asientos.length} egresos creados.`);
  const quedan = (await asientosPendientes()).length;
  console.log(`Abonos de ajuste en efectivo sin egreso: ${quedan} (debe ser 0).`);
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  if (ONLY_AP) console.log(`Limitado a: ${ONLY_AP}`);
  if (FASE) console.log(`Solo fase ${FASE}`);
  console.log();

  const planeados = FASE === '2' ? [] : await fase1();
  if (FASE !== '1') await fase2(planeados);

  if (!APPLY) console.log('\nDry-run: no se escribió nada. Repite con --apply para aplicar.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
