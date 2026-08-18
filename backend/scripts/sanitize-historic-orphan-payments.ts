/**
 * Saneamiento histórico de abonos que nunca llegaron a caja.
 *
 * Contexto
 * --------
 * Hasta agosto de 2026 tres rutas creaban `Payment` sin su `CashMovement`:
 * el bypass de DTF, `orders.update()` y cualquier cobro con la caja cerrada.
 * El resultado en producción: cientos de abonos cobrados de verdad que nunca
 * aparecieron en el historial de caja. Las tres rutas ya están corregidas; este
 * script solo se ocupa de lo que quedó atrás.
 *
 * Por qué no se reabren las sesiones originales
 * ---------------------------------------------
 * Al cerrar una sesión, `closingAmount`, `systemBalance` y `discrepancy` quedan
 * congelados y no se recalculan. Insertar ingresos en una sesión cerrada haría
 * que su arqueo —ya firmado— deje de cuadrar con sus movimientos. En vez de eso
 * se crean sesiones de ajuste nuevas, en una caja registradora aparte, para no
 * mezclar asientos de corrección con los arqueos físicos de la caja operativa.
 *
 * Las sesiones de ajuste nacen CERRADAS. Una sesión de ajuste abierta sería
 * capturada por `findFirst({ status: 'OPEN' })` y se llevaría todos los cobros
 * nuevos.
 *
 * Qué NO toca
 * -----------
 * `paidAmount` y `balance` de las órdenes se calculan desde los pagos, no desde
 * los movimientos: ningún saldo de cliente cambia. Tampoco toca los abonos en
 * cola (`pendingCashEntry`), que entran solos al abrir la próxima caja.
 *
 * Uso
 * ---
 *   npx ts-node scripts/sanitize-historic-orphan-payments.ts                 # dry-run sobre .env.development
 *   npx ts-node scripts/sanitize-historic-orphan-payments.ts --env=staging
 *   npx ts-node scripts/sanitize-historic-orphan-payments.ts --env=staging --apply
 *   DATABASE_URL='postgresql://...' npx ts-node scripts/sanitize-historic-orphan-payments.ts --apply
 *
 * Opciones
 *   --apply         escribe (por defecto solo simula)
 *   --from=YYYY-MM-DD  corte inferior por fecha de registro (default 2026-05-15)
 *   --env=<nombre>  archivo .env.<nombre> del que leer DATABASE_URL
 *
 * Es idempotente: filtra por `cashMovementId IS NULL`, así que volver a correrlo
 * no duplica nada.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';

const APPLY = process.argv.includes('--apply');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const FROM =
  process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] ?? '2026-05-15';

/** Caja dedicada: mantiene los ajustes fuera de los arqueos físicos. */
const ADJUSTMENT_REGISTER_NAME = 'Ajustes Históricos';
/** Prefijo propio para no consumir la secuencia real de recibos (`RC-`). */
const RECEIPT_PREFIX = 'AJU';

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
  const match = fs
    .readFileSync(envPath, 'utf8')
    .match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  return match[1];
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

/** Último instante del mes al que pertenece `date`. */
const endOfMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59));

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  console.log(`Corte inferior: ${FROM}\n`);

  // Se excluyen: el saldo a favor (por diseño no genera movimiento; ese dinero
  // ya entró en la OP de origen), los abonos en cola (entran al abrir caja) y
  // los de monto cero, que solo agregarían ruido al arqueo.
  const orphans = await prisma.payment.findMany({
    where: {
      cashMovementId: null,
      pendingCashEntry: false,
      paymentMethod: { not: 'CREDIT_BALANCE' },
      amount: { gt: 0 },
      createdAt: { gte: new Date(FROM) },
    },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentDate: true,
      createdAt: true,
      receivedById: true,
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (orphans.length === 0) {
    console.log('No hay abonos huérfanos que sanear. Nada que hacer.');
    return;
  }

  // Agrupar por mes de registro: una sesión de ajuste por mes preserva la
  // distribución temporal y evita meter todo el histórico en un solo día.
  const byMonth = new Map<string, typeof orphans>();
  for (const p of orphans) {
    const key = monthKey(p.createdAt);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(p);
  }

  let total = new Prisma.Decimal(0);
  console.log('Resumen por mes:');
  for (const [mes, pagos] of [...byMonth.entries()].sort()) {
    const suma = pagos.reduce(
      (acc, p) => acc.add(p.amount),
      new Prisma.Decimal(0),
    );
    total = total.add(suma);
    console.log(
      `  ${mes}  ${String(pagos.length).padStart(4)} abonos   ${money(suma).padStart(16)}`,
    );
  }
  console.log(
    `  ${'TOTAL'.padEnd(7)} ${String(orphans.length).padStart(3)} abonos   ${money(total).padStart(16)}\n`,
  );

  if (!APPLY) {
    console.log('Muestra de los primeros 10 abonos a sanear:');
    for (const p of orphans.slice(0, 10)) {
      console.log(
        `  ${p.order?.orderNumber ?? '(sin OP)'}  ${p.paymentDate.toISOString().slice(0, 10)}  ` +
          `${p.paymentMethod.padEnd(9)} ${money(p.amount)}`,
      );
    }
    console.log('\nDry-run: no se escribió nada. Repetí con --apply para aplicar.');
    return;
  }

  // ── Aplicar ────────────────────────────────────────────────────────────────

  const register = await prisma.cashRegister.upsert({
    where: { name: ADJUSTMENT_REGISTER_NAME },
    create: {
      name: ADJUSTMENT_REGISTER_NAME,
      description:
        'Caja contable para asientos de corrección. No corresponde a dinero ' +
        'contado físicamente: agrupa abonos que se cobraron sin caja abierta.',
      // Inactiva: nadie debe abrir sesiones operativas acá.
      isActive: false,
    },
    update: {},
  });
  console.log(`Caja de ajustes: ${register.name} (${register.id})\n`);

  // El usuario que queda como responsable es el que más abonos huérfanos
  // registró: es quien el cliente reconoce en esas OPs.
  const conteo = new Map<string, number>();
  for (const p of orphans) {
    conteo.set(p.receivedById, (conteo.get(p.receivedById) ?? 0) + 1);
  }
  const responsableId = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];

  let secuencia = 0;
  let movimientosCreados = 0;

  for (const [mes, pagos] of [...byMonth.entries()].sort()) {
    const suma = pagos.reduce(
      (acc, p) => acc.add(p.amount),
      new Prisma.Decimal(0),
    );
    const cierre = endOfMonth(pagos[pagos.length - 1].createdAt);

    // Una transacción por mes: si algo falla, ese mes queda intacto y los
    // anteriores ya aplicados siguen siendo válidos (el script es idempotente).
    await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          cashRegisterId: register.id,
          openedById: responsableId,
          closedById: responsableId,
          status: 'CLOSED',
          openingAmount: new Prisma.Decimal(0),
          // Se declara el cierre igual al saldo del sistema: es un asiento
          // contable, no un conteo físico, así que no puede haber descuadre.
          closingAmount: suma,
          systemBalance: suma,
          discrepancy: new Prisma.Decimal(0),
          openedAt: cierre,
          closedAt: cierre,
          notes:
            `Ajuste histórico ${mes}: ${pagos.length} abonos cobrados sin caja ` +
            `abierta. No corresponde a un arqueo físico.`,
        },
      });

      // Los ids se generan acá para poder insertar todos los movimientos de
      // una y enlazar los pagos en una sola sentencia. Hacerlo pago por pago
      // son ~2 round-trips por abono contra una base remota: con cientos de
      // registros la transacción expira antes de terminar.
      const movimientos = pagos.map((p) => {
        secuencia++;
        return {
          id: randomUUID(),
          paymentId: p.id,
          cashSessionId: session.id,
          receiptNumber: `${RECEIPT_PREFIX}-${cierre.getUTCFullYear()}-${String(
            secuencia,
          ).padStart(5, '0')}`,
          movementType: 'INCOME' as const,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          description:
            `Ajuste histórico — Abono a Orden ${p.order?.orderNumber ?? ''} ` +
            `(cobrado el ${p.paymentDate.toISOString().slice(0, 10)}, sin caja abierta)`,
          referenceType: 'ORDER',
          referenceId: p.order?.id ?? null,
          performedById: p.receivedById,
        };
      });

      await tx.cashMovement.createMany({
        data: movimientos.map(({ paymentId, ...m }) => m),
      });

      // `updateMany` no sirve: cada pago apunta a un movimiento distinto.
      const pares = Prisma.join(
        movimientos.map((m) => Prisma.sql`(${m.paymentId}, ${m.id})`),
      );
      await tx.$executeRaw`
        UPDATE payments AS p
        SET cash_movement_id = v.mov_id
        FROM (VALUES ${pares}) AS v(pay_id, mov_id)
        WHERE p.id = v.pay_id
      `;

      movimientosCreados += movimientos.length;

      console.log(
        `  ${mes}  sesión ${session.id.slice(0, 8)}  ${pagos.length} movimientos  ${money(suma)}`,
      );
    }, { timeout: 120_000, maxWait: 30_000 });
  }

  console.log(
    `\n✅ Listo: ${movimientosCreados} movimientos creados por ${money(total)}.`,
  );

  const quedan = await prisma.payment.count({
    where: {
      cashMovementId: null,
      pendingCashEntry: false,
      paymentMethod: { not: 'CREDIT_BALANCE' },
      amount: { gt: 0 },
      createdAt: { gte: new Date(FROM) },
    },
  });
  console.log(`Huérfanos restantes en el rango: ${quedan} (debe ser 0).`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
