/**
 * Anula los movimientos de caja generados por pagos con saldo a favor.
 *
 * Un pago con método CREDIT_BALANCE no mueve dinero: ese ingreso ya se registró
 * cuando el cliente sobrepagó la orden de origen. Antes del fix, el sistema creaba
 * igual un CashMovement INCOME que duplicaba ese ingreso en el reporte de caja.
 *
 * La anulación es administrativa: marca `is_voided` sin generar contramovimiento y
 * sin exigir sesión abierta, igual que hace el sistema al rechazar un anticipo
 * (ver `deleteRejectedPaymentAndRecalculate`). No altera `system_balance` ni
 * `discrepancy` de las sesiones cerradas — esos sólo cuentan movimientos CASH.
 *
 * Es idempotente: omite los movimientos ya anulados.
 *
 * Uso:
 *   DATABASE_URL='postgres://...' npx ts-node prisma/void-credit-balance-cash-movements.ts
 *   ... --dry-run   para ver qué haría sin escribir nada
 */
import { Client } from 'pg';
import 'dotenv/config';

const VOID_REASON =
  'Movimiento duplicado: pago con saldo a favor, el ingreso ya se registró en la orden de origen';

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta DATABASE_URL');

  const db = new Client({ connectionString });
  await db.connect();

  console.log(`Base de datos: ${new URL(connectionString).host}`);
  console.log(dryRun ? 'Modo: DRY-RUN (no escribe)\n' : 'Modo: aplicar cambios\n');

  const { rows: targets } = await db.query<{
    movement_id: string;
    receipt_number: string;
    amount: string;
    order_number: string;
    session_status: string;
  }>(`
    SELECT cm.id AS movement_id, cm.receipt_number, cm.amount,
           o.order_number, cs.status AS session_status
      FROM payments p
      JOIN cash_movements cm ON cm.id = p.cash_movement_id
      JOIN orders o          ON o.id = p.order_id
      LEFT JOIN cash_sessions cs ON cs.id = cm.cash_session_id
     WHERE p.payment_method = 'CREDIT_BALANCE'
       AND cm.is_voided = false
     ORDER BY cm.created_at ASC
  `);

  if (targets.length === 0) {
    console.log('No hay movimientos de caja pendientes de anular. Nada que hacer.\n');
    await db.end();
    return;
  }

  let total = 0;
  for (const row of targets) {
    total += Number(row.amount);
    console.log(
      `  ${row.receipt_number}  ${money(row.amount).padStart(14)}  ${row.order_number}` +
        `  · sesión ${row.session_status}`,
    );
  }
  console.log(`\n  ${targets.length} movimiento(s), ${money(total)} en total.`);

  if (dryRun) {
    console.log('\nDRY-RUN: no se escribió nada.\n');
    await db.end();
    return;
  }

  const { rowCount } = await db.query(
    `UPDATE cash_movements
        SET is_voided = true,
            voided_at = NOW(),
            void_reason = $2,
            updated_at = NOW()
      WHERE id = ANY($1::text[])
        AND is_voided = false`,
    [targets.map((row) => row.movement_id), VOID_REASON],
  );

  console.log(`\n✅ Anulados ${rowCount} movimiento(s).\n`);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
