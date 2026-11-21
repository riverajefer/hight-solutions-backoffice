/**
 * Elimina una OG ya pagada: anula sus egresos de caja y borra la OG y su CP espejo.
 *
 * Sirve para un caso puntual que la app no cubre: una OG pagada con un valor
 * mayor al real. La edición de una OG pagada solo deja subir el total (ver
 * `assertTotalCoversPaid`), y eliminarla solo se permite en BORRADOR/CREADA sin
 * firma del admin. Caso que lo originó: OG-2026-1224 (20-nov-2026), $109.585
 * en efectivo; el cliente confirmó que el dinero no salió del cajón y que
 * crearán una OG nueva con el valor correcto.
 *
 * Qué hace, en una sola transacción:
 *   1. Anula los egresos de caja de la OG (y los de los abonos de su CP) con el
 *      patrón de anulación administrativa: `isVoided` + quién, cuándo y motivo,
 *      sin contramovimiento. El saldo de caja ya los excluye.
 *   2. Borra la CP espejo (sus abonos, cuotas, adjuntos y solicitudes caen en cascada).
 *   3. Borra la OG (ítems, líneas de pago, áreas, solicitudes y amarres con la OT
 *      caen en cascada).
 *   4. Deja en `audit_logs` la foto completa de lo borrado y de cada anulación.
 *
 * Solo trabaja con sesiones de caja ABIERTAS: una sesión cerrada congela
 * `systemBalance`, y anular ahí descuadraría un arqueo firmado. Si la sesión
 * tiene el arqueo en curso, anular dispara el aviso de «movimientos que
 * cambiaron después de iniciar el arqueo» al cerrar; eso es lo esperado.
 * Supone que el efectivo del egreso sigue (o volvió) en el cajón: si salió, la
 * anulación crea un faltante.
 *
 * Uso:
 *   npx ts-node scripts/delete-paid-expense-order.ts --og=OG-2026-1224 --reason="…"
 *   npx ts-node scripts/delete-paid-expense-order.ts --og=OG-2026-1224 --reason="…" --env=staging --apply
 *
 *   # Contra producción sin escribir la contraseña en disco:
 *   DATABASE_URL='postgresql://...' npx ts-node scripts/delete-paid-expense-order.ts \
 *     --env=production --og=OG-2026-1224 --reason="…"
 *
 * Opciones:
 *   --og=<número>    OG a eliminar (obligatorio).
 *   --reason="…"     Motivo (obligatorio, mín. 10 caracteres). Queda en cada egreso anulado.
 *   --by=<username>  Usuario que figura en la auditoría (por defecto adminsistema).
 *   --apply          Aplica los cambios (por defecto solo muestra).
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Prisma, PrismaClient } from '../src/generated/prisma';
import { CASH_IN_DRAWER_WHERE } from '../src/modules/cash-movement/cash-movement.helpers';

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const APPLY = process.argv.includes('--apply');
const ENV = arg('env') ?? 'development';
const BY_USERNAME = arg('by') ?? 'adminsistema';
const OG_NUMBER = arg('og')?.trim();
const REASON = arg('reason')?.trim() ?? '';
const SCRIPT = 'delete-paid-expense-order';

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
  // Igual que `db-query.sh`: .env.production usa comillas simples y deja un
  // espacio al final; sin quitar ambos, la URL llega rota al driver.
  const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL[ \t]*=[ \t]*(.*)$/m);
  const url = match?.[1].trim().replace(/^['"]|['"]$/g, '').trim();
  if (!url) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  return url;
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

const bogota = (d: Date) =>
  d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/** Misma fórmula que `closeSession`: fondo + ingresos/depósitos − egresos/retiros, solo efectivo. */
async function computeSystemBalance(
  db: Prisma.TransactionClient | PrismaClient,
  cashSessionId: string,
  openingAmount: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const movements = await db.cashMovement.findMany({
    where: { cashSessionId, ...CASH_IN_DRAWER_WHERE },
    select: { movementType: true, amount: true },
  });
  return movements.reduce(
    (acc, m) =>
      m.movementType === 'INCOME' || m.movementType === 'DEPOSIT'
        ? acc.add(m.amount)
        : acc.sub(m.amount),
    new Prisma.Decimal(openingAmount),
  );
}

/** Convierte Decimal/Date a texto para guardarlos como JSON en audit_logs. */
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value));

async function main() {
  if (!OG_NUMBER) fail('Falta --og=<número de OG>');
  if (REASON.length < 10) fail('Falta --reason="…" (mínimo 10 caracteres)');

  console.log(`\nAmbiente: ${ENV} · ${APPLY ? 'APLICAR' : 'SIMULACIÓN (sin --apply no se escribe nada)'}\n`);

  const actor = await prisma.user.findUnique({
    where: { username: BY_USERNAME },
    select: { id: true, username: true },
  });
  if (!actor) fail(`No existe el usuario ${BY_USERNAME}`);

  const og = await prisma.expenseOrder.findUnique({
    where: { ogNumber: OG_NUMBER },
    include: {
      items: { include: { payments: true, productionAreas: true } },
      workOrderItems: true,
      accountPayable: {
        include: { payments: true, installments: true, attachments: true },
      },
    },
  });
  if (!og) fail(`No existe la ${OG_NUMBER}`);

  const itemIds = og.items.map((i) => i.id);
  const lots = await prisma.supplyLot.count({ where: { expenseOrderItemId: { in: itemIds } } });
  if (lots > 0) {
    fail(`La ${OG_NUMBER} tiene ${lots} rollo(s)/lote(s) de inventario amarrados a sus ítems. Resuélvelos primero.`);
  }

  // Egresos de la OG y los de los abonos de su CP (normalmente son los mismos).
  const apMovementIds = (og.accountPayable?.payments ?? [])
    .map((p) => p.cashMovementId)
    .filter((id): id is string => !!id);
  const movements = await prisma.cashMovement.findMany({
    where: {
      OR: [
        { referenceType: 'EXPENSE_ORDER', referenceId: og.id },
        { id: { in: apMovementIds } },
      ],
      originalMovement: null, // los contramovimientos -ANUL no se tocan
    },
    include: {
      cashSession: {
        select: { id: true, status: true, openingAmount: true, countStartedAt: true, openedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const toVoid = movements.filter((m) => !m.isVoided);
  const closed = toVoid.filter((m) => m.cashSession?.status !== 'OPEN');
  if (closed.length > 0) {
    fail(
      `Hay egresos en sesiones de caja cerradas (${closed.map((m) => m.receiptNumber).join(', ')}). ` +
        'Este script solo anula en sesiones abiertas: un cierre firmado no se recalcula aquí.',
    );
  }

  // ── Resumen ──
  console.log(`${og.ogNumber} · estado ${og.status} · creada ${bogota(og.createdAt)}`);
  for (const item of og.items) {
    console.log(
      `  ítem: ${item.quantity} × ${money(item.unitPrice)} = ${money(item.total)} · ${item.paymentMethod ?? '—'}` +
        ` · líneas de pago: ${item.payments.length}`,
    );
  }
  console.log(`  amarres con ítems de OT: ${og.workOrderItems.length}`);
  if (og.accountPayable) {
    const ap = og.accountPayable;
    console.log(
      `  ${ap.apNumber} · ${ap.status} · total ${money(ap.totalAmount)} · pagado ${money(ap.paidAmount)}` +
        ` · abonos ${ap.payments.length} · cuotas ${ap.installments.length} · adjuntos ${ap.attachments.length}`,
    );
  } else {
    console.log('  (sin CP espejo)');
  }

  console.log(`\nEgresos a anular: ${toVoid.length}`);
  const sessions = new Map<string, NonNullable<(typeof toVoid)[number]['cashSession']>>();
  for (const m of toVoid) {
    console.log(`  ${m.receiptNumber} · ${m.movementType} · ${money(m.amount)} · ${m.paymentMethod} · ${bogota(m.createdAt)}`);
    if (m.cashSession) sessions.set(m.cashSession.id, m.cashSession);
  }
  const before = new Map<string, Prisma.Decimal>();
  for (const s of sessions.values()) {
    const balance = await computeSystemBalance(prisma, s.id, new Prisma.Decimal(s.openingAmount));
    before.set(s.id, balance);
    const delta = toVoid
      .filter((m) => m.cashSession?.id === s.id && m.paymentMethod === 'CASH')
      .reduce((acc, m) => acc.add(m.amount), new Prisma.Decimal(0));
    console.log(
      `  Sesión ${s.id} (abierta ${bogota(s.openedAt)}): efectivo esperado ${money(balance)} → ${money(balance.add(delta))}`,
    );
    if (s.countStartedAt) {
      console.log(
        `  ⚠️  Arqueo en curso desde ${bogota(s.countStartedAt)}: al cerrar, Caja verá el aviso de movimientos que cambiaron.`,
      );
    }
  }

  if (!APPLY) {
    console.log('\nSimulación: no se escribió nada. Repite con --apply para aplicar.');
    return;
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const m of toVoid) {
      // Se vuelve a exigir sesión abierta y movimiento vivo al escribir.
      const { count } = await tx.cashMovement.updateMany({
        where: { id: m.id, isVoided: false, cashSession: { is: { status: 'OPEN' } } },
        data: {
          isVoided: true,
          voidedById: actor.id,
          voidedAt: now,
          voidReason: `Eliminación de ${og.ogNumber}: ${REASON}`,
        },
      });
      if (count !== 1) throw new Error(`${m.receiptNumber} cambió (se anuló o se cerró su sesión) mientras corría el script`);
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          recordId: m.id,
          action: 'UPDATE',
          model: 'CashMovement',
          oldData: { isVoided: false },
          newData: { isVoided: true, voidedAt: now.toISOString(), voidReason: `Eliminación de ${og.ogNumber}: ${REASON}` },
          changedFields: ['isVoided', 'voidedById', 'voidedAt', 'voidReason'],
          metadata: { script: SCRIPT, ogNumber: og.ogNumber, reason: REASON },
        },
        select: { id: true },
      });
    }

    if (og.accountPayable) {
      await tx.accountPayable.delete({ where: { id: og.accountPayable.id }, select: { id: true } });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          recordId: og.accountPayable.id,
          action: 'DELETE',
          model: 'AccountPayable',
          oldData: snapshot(og.accountPayable),
          metadata: { script: SCRIPT, ogNumber: og.ogNumber, reason: REASON },
        },
        select: { id: true },
      });
    }

    await tx.expenseOrder.delete({ where: { id: og.id }, select: { id: true } });
    const { accountPayable: _ap, ...ogSnapshot } = og;
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        recordId: og.id,
        action: 'DELETE',
        model: 'ExpenseOrder',
        oldData: snapshot(ogSnapshot),
        metadata: {
          script: SCRIPT,
          reason: REASON,
          voidedReceipts: toVoid.map((m) => m.receiptNumber),
          accountPayableNumber: og.accountPayable?.apNumber ?? null,
        },
      },
      select: { id: true },
    });

    // Comprobación: el esperado de cada sesión debe subir exactamente lo anulado en efectivo.
    for (const s of sessions.values()) {
      const delta = toVoid
        .filter((m) => m.cashSession?.id === s.id && m.paymentMethod === 'CASH')
        .reduce((acc, m) => acc.add(m.amount), new Prisma.Decimal(0));
      const after = await computeSystemBalance(tx, s.id, new Prisma.Decimal(s.openingAmount));
      if (!after.equals(before.get(s.id)!.add(delta))) {
        throw new Error(`La sesión ${s.id} quedó en ${money(after)}; se esperaba ${money(before.get(s.id)!.add(delta))}`);
      }
    }
  });

  console.log(`\n✅ ${og.ogNumber} eliminada; ${toVoid.length} egreso(s) anulado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
