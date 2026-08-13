/**
 * Saneamiento de movimientos de caja que inflan el arqueo.
 *
 * Corrige dos situaciones creadas por los bugs de anulación (ver
 * advance-payment-approvals.service.ts y cash-movement.service.ts):
 *
 *   A. Movimientos INCOME de tipo ORDER cuyo pago fue eliminado por un
 *      **anticipo rechazado** (o porque la orden ya no existe / está anulada).
 *      El movimiento quedó activo y sigue contando como ingreso.
 *
 *   B. Contramovimientos de anulación (`-ANUL`) creados con el mismo tipo que
 *      el original en vez del inverso.
 *
 * NO basta con "el movimiento no tiene pago vinculado": en producción hay
 * movimientos sin pago vinculado que corresponden a **dinero realmente
 * recibido** — el pago existe pero con `cash_movement_id` en NULL, así que el
 * vínculo se perdió sin que el ingreso fuera falso. Anularlos borraría plata
 * legítima del arqueo. Por eso [A] exige además evidencia de rechazo, y todo lo
 * que no la tenga se reporta aparte para revisión manual, nunca se toca.
 *
 * Uso:
 *   npx ts-node scripts/fix-orphan-cash-movements.ts                    # dry-run sobre .env.development
 *   npx ts-node scripts/fix-orphan-cash-movements.ts --env=staging      # dry-run sobre .env.staging
 *   npx ts-node scripts/fix-orphan-cash-movements.ts --env=staging --apply
 *
 *   # Contra producción sin escribir la contraseña en disco:
 *   DATABASE_URL='postgresql://...' npx ts-node scripts/fix-orphan-cash-movements.ts --env=production
 *
 * IMPORTANTE: sanear una sesión ya CERRADA cambia su saldo de sistema y por
 * tanto su descuadre histórico. El script solo toca sesiones abiertas; las
 * cerradas se listan aparte y requieren --include-closed explícito.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';

const APPLY = process.argv.includes('--apply');
const INCLUDE_CLOSED = process.argv.includes('--include-closed');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';

/**
 * Prioridad: variable de entorno DATABASE_URL > backend/.env.<ambiente>.
 * La variable permite correr contra producción sin dejar la contraseña en disco.
 */
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
  const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  return match[1];
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  console.log(INCLUDE_CLOSED ? 'Incluye sesiones cerradas' : 'Solo sesiones abiertas\n');

  // ─── A. Movimientos de orden sin pago vinculado ───────────────────────────
  const candidates = await prisma.cashMovement.findMany({
    where: {
      movementType: 'INCOME',
      referenceType: 'ORDER',
      isVoided: false,
      linkedPayment: null,
      // Un contramovimiento de anulación nunca tuvo pago vinculado: no es huérfano.
      originalMovement: null,
      ...(INCLUDE_CLOSED ? {} : { cashSession: { status: 'OPEN' } }),
    },
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      description: true,
      referenceId: true,
      createdAt: true,
      cashSession: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Evidencia de rechazo: la orden quedó marcada como anticipo rechazado, o
  // conserva alguna solicitud RECHAZADA (el estado de la orden se sobrescribe
  // si más tarde se aprueba otro anticipo, así que hay que mirar ambas).
  const orderIds = [...new Set(candidates.map((m) => m.referenceId).filter(Boolean))] as string[];
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      advancePaymentStatus: true,
      advancePaymentApprovals: { where: { status: 'REJECTED' }, select: { id: true } },
    },
  });
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const orphans: typeof candidates = [];
  const unexplained: typeof candidates = [];

  for (const m of candidates) {
    const order = m.referenceId ? orderById.get(m.referenceId) : undefined;
    const rejected =
      !order || // la orden ya no existe: el pago se fue con ella
      order.status === 'ANULADO' ||
      order.advancePaymentStatus === 'REJECTED' ||
      order.advancePaymentApprovals.length > 0;
    (rejected ? orphans : unexplained).push(m);
  }

  console.log(`\n[A] Movimientos a anular (con evidencia de rechazo): ${orphans.length}`);
  for (const m of orphans) {
    console.log(
      `  ${m.receiptNumber}  ${money(m.amount)}  sesión ${m.cashSession.status}  ${m.description}`,
    );
  }
  const totalA = orphans.reduce((s, m) => s + Number(String(m.amount)), 0);
  console.log(`  Total a retirar del arqueo: ${money(totalA)}`);

  // ─── C. Sin evidencia de rechazo → NO se tocan ────────────────────────────
  if (unexplained.length > 0) {
    const totalC = unexplained.reduce((s, m) => s + Number(String(m.amount)), 0);
    console.log(
      `\n[C] SIN evidencia de rechazo — NO se tocan, requieren revisión manual: ${unexplained.length}`,
    );
    for (const m of unexplained) {
      const order = m.referenceId ? orderById.get(m.referenceId) : undefined;
      console.log(
        `  ${m.receiptNumber}  ${money(m.amount)}  ${order?.orderNumber ?? '(sin orden)'}  ${m.description}`,
      );
    }
    console.log(`  Total en revisión: ${money(totalC)}`);
    console.log(
      '  Probable causa: el pago existe pero perdió el vínculo (payments.cash_movement_id NULL).',
    );
    console.log('  Anularlos borraría ingresos reales — revisar uno por uno antes de decidir.');
  }

  // ─── B. Contramovimientos con tipo no invertido ───────────────────────────
  const badCounters = await prisma.cashMovement.findMany({
    where: {
      originalMovement: { isNot: null },
      ...(INCLUDE_CLOSED ? {} : { cashSession: { status: 'OPEN' } }),
    },
    select: {
      id: true,
      receiptNumber: true,
      movementType: true,
      amount: true,
      cashSession: { select: { status: true } },
      originalMovement: { select: { receiptNumber: true, movementType: true } },
    },
  });

  const INVERSE = {
    INCOME: 'EXPENSE',
    EXPENSE: 'INCOME',
    WITHDRAWAL: 'DEPOSIT',
    DEPOSIT: 'WITHDRAWAL',
  } as const;

  const toFix = badCounters.filter(
    (c) => c.originalMovement && c.movementType !== INVERSE[c.originalMovement.movementType],
  );

  console.log(`\n[B] Contramovimientos con tipo incorrecto: ${toFix.length}`);
  for (const c of toFix) {
    console.log(
      `  ${c.receiptNumber}  ${c.movementType} → ${INVERSE[c.originalMovement!.movementType]}  ${money(c.amount)}  sesión ${c.cashSession.status}`,
    );
  }

  if (!APPLY) {
    console.log('\nDry-run: no se aplicó ningún cambio. Repetir con --apply.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (orphans.length > 0) {
      await tx.cashMovement.updateMany({
        where: { id: { in: orphans.map((m) => m.id) } },
        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidReason: 'Saneamiento: pago eliminado (anticipo rechazado u orden borrada)',
        },
      });
    }

    for (const c of toFix) {
      await tx.cashMovement.update({
        where: { id: c.id },
        data: { movementType: INVERSE[c.originalMovement!.movementType] },
      });
    }
  });

  console.log(`\nAplicado: ${orphans.length} anulados, ${toFix.length} tipos corregidos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
