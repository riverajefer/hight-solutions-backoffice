/**
 * Saneamiento de Cuentas por Pagar cuyo dinero ya salió por su Orden de Gasto.
 *
 * Contexto
 * --------
 * Al crear una OG se crea automáticamente su CP espejo con el total y saldo
 * completo. Cuando Caja autoriza la OG, `cajaAuthorize` crea un `CashMovement`
 * de egreso por cada ítem —ahí sale el dinero— y marca la OG como `PAID`, pero
 * nunca tocaba la CP. Resultado en producción a septiembre de 2026: 328 cuentas
 * mostrando $64.7M de deuda viva que en realidad ya se giró, y 6 casos en que
 * alguien las pagó otra vez ($3.317.400 fuera de caja por partida doble).
 *
 * `AccountsPayableService.settleFromExpenseOrderMovements` ya cierra el hueco
 * para las OG que se autoricen de aquí en adelante; este script se ocupa de lo
 * que quedó atrás.
 *
 * Qué hace
 * --------
 * Refleja cada `CashMovement` de la OG como un `AccountPayablePayment` de su CP,
 * vinculado al movimiento que ya existe (`cashMovementId`), y recalcula
 * `paidAmount`, `balance` y `status` desde los pagos vivos.
 *
 * **No mueve dinero.** No crea, anula ni modifica ningún `CashMovement`: los
 * arqueos de caja quedan exactamente igual. Lo único que cambia es que la CP
 * deja de aparecer debiendo lo que ya se pagó, y su historial muestra por dónde
 * salió.
 *
 * Qué NO toca
 * -----------
 * - CP anuladas.
 * - CP que ya tienen pagos propios registrados y además movimientos de la OG sin
 *   reflejar: son los posibles dobles pagos. Reflejarlos las dejaría con
 *   `paidAmount` del doble de su total. Se listan para revisión manual — la
 *   decisión (devolución, o anular uno de los dos movimientos) es de Caja, no de
 *   un script.
 * - CP donde los movimientos de la OG superan el total de la cuenta: dejarían el
 *   saldo en negativo. Hoy no hay ninguna; si aparece, se reporta y se salta.
 *
 * Las CP que quedan en PARTIAL conservan un saldo real y pagable: los
 * movimientos son por ítem (la base) y el total de la CP incluye IVA, así que la
 * diferencia sigue debiéndose de verdad.
 *
 * Uso
 * ---
 *   npx ts-node scripts/sanitize-ap-paid-via-expense-order.ts                    # dry-run sobre .env.development
 *   npx ts-node scripts/sanitize-ap-paid-via-expense-order.ts --env=staging
 *   npx ts-node scripts/sanitize-ap-paid-via-expense-order.ts --env=staging --apply
 *   npx ts-node scripts/sanitize-ap-paid-via-expense-order.ts --env=production --ap=CP-2026-678 --apply
 *
 * Opciones
 *   --apply         escribe (por defecto solo simula)
 *   --ap=<numero>   limita a una sola CP, para probar el efecto en un caso
 *   --env=<nombre>  archivo .env.<nombre> del que leer DATABASE_URL
 *
 * Es idempotente: solo mira movimientos que todavía no tienen pago asociado, así
 * que volver a correrlo no duplica nada.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma, AccountPayableStatus } from '../src/generated/prisma';

const APPLY = process.argv.includes('--apply');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const ONLY_AP = process.argv.find((a) => a.startsWith('--ap='))?.split('=')[1];

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
  // simples y deja un espacio al final. Un regex que solo contempla comillas
  // dobles se lleva la comilla dentro de la URL y falla con "Can't reach
  // database server at base".
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

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

type Movimiento = {
  id: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  createdAt: Date;
  performedById: string;
  receiptNumber: string;
};

type Caso = {
  id: string;
  apNumber: string;
  ogNumber: string;
  status: AccountPayableStatus;
  totalAmount: Prisma.Decimal;
  pagosPropios: number;
  movimientos: Movimiento[];
  porReflejar: Prisma.Decimal;
};

async function recolectar(): Promise<Caso[]> {
  const cuentas = await prisma.accountPayable.findMany({
    where: {
      expenseOrderId: { not: null },
      status: { not: AccountPayableStatus.CANCELLED },
      ...(ONLY_AP && { apNumber: ONLY_AP }),
    },
    select: {
      id: true,
      apNumber: true,
      status: true,
      totalAmount: true,
      expenseOrderId: true,
      expenseOrder: { select: { ogNumber: true } },
      payments: { where: { isReversed: false }, select: { id: true } },
    },
    orderBy: { apNumber: 'asc' },
  });

  const casos: Caso[] = [];

  for (const ap of cuentas) {
    const movimientos = (await prisma.cashMovement.findMany({
      where: {
        referenceType: 'EXPENSE_ORDER',
        referenceId: ap.expenseOrderId!,
        movementType: 'EXPENSE',
        isVoided: false,
        accountPayablePayment: { is: null },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        performedById: true,
        receiptNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    })) as Movimiento[];

    if (movimientos.length === 0) continue;

    casos.push({
      id: ap.id,
      apNumber: ap.apNumber,
      ogNumber: ap.expenseOrder?.ogNumber ?? '(sin OG)',
      status: ap.status,
      totalAmount: new Prisma.Decimal(ap.totalAmount),
      pagosPropios: ap.payments.length,
      movimientos,
      porReflejar: movimientos.reduce(
        (sum, m) => sum.add(m.amount),
        new Prisma.Decimal(0),
      ),
    });
  }

  return casos;
}

/** Refleja los movimientos de una CP y recalcula su saldo. Devuelve el estado final. */
async function sanear(caso: Caso): Promise<AccountPayableStatus> {
  return prisma.$transaction(async (tx) => {
    for (const mov of caso.movimientos) {
      await tx.accountPayablePayment.create({
        data: {
          accountPayableId: caso.id,
          amount: mov.amount,
          paymentMethod: mov.paymentMethod as never,
          paymentDate: mov.createdAt,
          reference: mov.receiptNumber,
          notes:
            'Saneamiento: pago realizado en la autorización de Caja de la Orden ' +
            `de Gasto ${caso.ogNumber} (recibo ${mov.receiptNumber})`,
          registeredById: mov.performedById,
          cashMovementId: mov.id,
        },
      });
    }

    const vivos = await tx.accountPayablePayment.findMany({
      where: { accountPayableId: caso.id, isReversed: false },
      select: { amount: true },
    });
    const paidAmount = vivos.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
    const balance = caso.totalAmount.sub(paidAmount);
    const status = balance.lessThanOrEqualTo(0)
      ? AccountPayableStatus.PAID
      : AccountPayableStatus.PARTIAL;

    await tx.accountPayable.update({
      where: { id: caso.id },
      data: { paidAmount, balance, status },
    });

    return status;
  });
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  if (ONLY_AP) console.log(`Limitado a: ${ONLY_AP}`);
  console.log();

  const casos = await recolectar();

  if (casos.length === 0) {
    console.log('No hay cuentas por sanear. Nada que hacer.');
    return;
  }

  const conPagosPropios = casos.filter((c) => c.pagosPropios > 0);
  const excedidas = casos.filter(
    (c) => c.pagosPropios === 0 && c.porReflejar.greaterThan(c.totalAmount),
  );
  const saneables = casos.filter(
    (c) => c.pagosPropios === 0 && c.porReflejar.lessThanOrEqualTo(c.totalAmount),
  );

  const quedanPagadas = saneables.filter((c) => c.porReflejar.equals(c.totalAmount));
  const quedanParciales = saneables.filter((c) => c.porReflejar.lessThan(c.totalAmount));
  const suma = (lista: Caso[], campo: (c: Caso) => Prisma.Decimal) =>
    lista.reduce((acc, c) => acc.add(campo(c)), new Prisma.Decimal(0));

  console.log('A sanear:');
  console.log(
    `  ${String(quedanPagadas.length).padStart(4)} CP quedan PAID      ` +
      `${money(suma(quedanPagadas, (c) => c.porReflejar)).padStart(16)}`,
  );
  console.log(
    `  ${String(quedanParciales.length).padStart(4)} CP quedan PARTIAL   ` +
      `${money(suma(quedanParciales, (c) => c.porReflejar)).padStart(16)}  ` +
      `(saldo real que sigue vivo: ${money(
        suma(quedanParciales, (c) => c.totalAmount.sub(c.porReflejar)),
      )})`,
  );

  if (conPagosPropios.length > 0) {
    console.log('\n⚠️  NO se tocan — ya tienen pagos propios además del giro por la OG.');
    console.log('   Posible doble salida de caja. Revisar con Caja una por una:');
    for (const c of conPagosPropios) {
      console.log(
        `     ${c.apNumber}  ${c.ogNumber}  total ${money(c.totalAmount).padStart(14)}  ` +
          `girado por la OG ${money(c.porReflejar).padStart(14)}  ` +
          `(${c.pagosPropios} pago${c.pagosPropios === 1 ? '' : 's'} propio${c.pagosPropios === 1 ? '' : 's'})`,
      );
    }
  }

  if (excedidas.length > 0) {
    console.log('\n⚠️  NO se tocan — los movimientos de la OG superan el total de la CP');
    console.log('   (reflejarlos dejaría el saldo en negativo):');
    for (const c of excedidas) {
      console.log(
        `     ${c.apNumber}  ${c.ogNumber}  total ${money(c.totalAmount)}  ` +
          `movimientos ${money(c.porReflejar)}`,
      );
    }
  }

  if (!APPLY) {
    console.log('\nMuestra de las primeras 10 a sanear:');
    for (const c of saneables.slice(0, 10)) {
      const destino = c.porReflejar.equals(c.totalAmount) ? 'PAID' : 'PARTIAL';
      console.log(
        `  ${c.apNumber}  ${c.ogNumber}  ${c.status.padEnd(8)} → ${destino.padEnd(8)}  ` +
          `${money(c.porReflejar).padStart(14)} en ${c.movimientos.length} movimiento(s)`,
      );
    }
    console.log('\nDry-run: no se escribió nada. Repite con --apply para aplicar.');
    return;
  }

  // ── Aplicar ────────────────────────────────────────────────────────────────

  let ok = 0;
  const fallidas: Array<{ apNumber: string; error: string }> = [];

  for (const caso of saneables) {
    try {
      const status = await sanear(caso);
      ok++;
      console.log(
        `  ✔ ${caso.apNumber}  ${money(caso.porReflejar).padStart(14)}  → ${status}`,
      );
    } catch (error: any) {
      fallidas.push({ apNumber: caso.apNumber, error: error?.message ?? String(error) });
      console.error(`  ✘ ${caso.apNumber}: ${error?.message ?? error}`);
    }
  }

  console.log(`\n${ok} de ${saneables.length} cuentas saneadas.`);
  if (fallidas.length > 0) {
    console.log(`${fallidas.length} fallaron. Cada CP va en su propia transacción, ` +
      'así que las que fallaron quedaron intactas: se puede volver a correr el script.');
  }
  if (conPagosPropios.length > 0) {
    console.log(
      `${conPagosPropios.length} quedaron sin tocar por posible doble pago (ver arriba).`,
    );
  }
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
