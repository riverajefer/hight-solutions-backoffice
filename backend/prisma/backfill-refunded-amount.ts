/**
 * Backfill de `orders.refunded_amount` para las devoluciones ya aprobadas.
 *
 * La aprobación de una devolución restaba el monto a `paid_amount` sin dejar
 * constancia, así que cualquier recálculo posterior de `paid_amount` desde los
 * pagos resucitaba el dinero devuelto. Este script hace explícito ese descuento.
 *
 * NO altera saldos: sólo escribe `refunded_amount`. `paid_amount` y `balance`
 * quedan igual, porque el descuento ya estaba aplicado sobre ellos. Si detecta
 * que `paid_amount` no cuadra con `suma(pagos) - devoluciones`, lo reporta como
 * descuadre para revisión manual y no lo toca.
 *
 * Es idempotente: omite las órdenes cuyo `refunded_amount` ya está correcto.
 *
 * Uso:
 *   npm run prisma:backfill:refunded-amount
 *   npm run prisma:backfill:refunded-amount -- --dry-run
 */
import { Client } from 'pg';
import 'dotenv/config';

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

interface Row {
  id: string;
  order_number: string;
  status: string;
  total: string;
  paid_amount: string;
  refunded_amount: string;
  refunds_total: string;
  payments_total: string;
}

async function main() {
  let dryRun = process.argv.includes('--dry-run');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta DATABASE_URL');

  const db = new Client({ connectionString });
  await db.connect();

  console.log(`Base de datos: ${new URL(connectionString).host}`);

  // Permite dimensionar el impacto ANTES de desplegar la migración.
  const { rows: schemaRows } = await db.query<{ has_column: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'refunded_amount'
    ) AS has_column
  `);
  const hasColumn = schemaRows[0].has_column;

  if (!hasColumn) {
    console.log(
      'La columna `refunded_amount` no existe todavía: falta aplicar la migración\n' +
        '`20260814000000_add_refunded_amount_to_orders`. Se fuerza DRY-RUN.\n',
    );
    dryRun = true;
  } else {
    console.log(dryRun ? 'Modo: DRY-RUN (no escribe)\n' : 'Modo: aplicar cambios\n');
  }

  const { rows } = await db.query<Row>(`
    SELECT
      o.id, o.order_number, o.status, o.total, o.paid_amount,
      ${hasColumn ? 'o.refunded_amount' : '0'} AS refunded_amount,
      COALESCE(r.refunds_total, 0)  AS refunds_total,
      COALESCE(p.payments_total, 0) AS payments_total
    FROM orders o
    JOIN (
      SELECT order_id, SUM(refund_amount) AS refunds_total
        FROM refund_requests
       WHERE status = 'APPROVED'
       GROUP BY order_id
    ) r ON r.order_id = o.id
    LEFT JOIN (
      SELECT order_id, SUM(amount) AS payments_total
        FROM payments
       GROUP BY order_id
    ) p ON p.order_id = o.id
    ORDER BY o.order_number ASC
  `);

  console.log(`Órdenes con devoluciones aprobadas: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('Nada que conciliar.\n');
    await db.end();
    return;
  }

  const pending: Row[] = [];
  const drifted: Row[] = [];

  for (const row of rows) {
    const refunds = Number(row.refunds_total);
    const stored = Number(row.refunded_amount);
    const expectedPaid = Number(row.payments_total) - refunds;
    const actualPaid = Number(row.paid_amount);
    const mismatch = Math.abs(expectedPaid - actualPaid) > 0.01;

    const state = stored === refunds ? 'ya conciliada' : 'pendiente';
    console.log(
      `  ${row.order_number.padEnd(14)} ${row.status.padEnd(20)}` +
        ` devuelto ${money(refunds).padStart(14)}` +
        ` · pagos ${money(row.payments_total).padStart(14)}` +
        ` · paidAmount ${money(actualPaid).padStart(14)}  [${state}]`,
    );

    if (mismatch) {
      drifted.push(row);
      console.log(
        `      ⚠️  descuadre: paidAmount esperado ${money(expectedPaid)},` +
          ` almacenado ${money(actualPaid)} — NO se toca, revisar manualmente`,
      );
    }

    if (stored !== refunds) pending.push(row);
  }

  console.log(
    `\n  Pendientes de conciliar: ${pending.length}` +
      `  ·  con descuadre en paidAmount: ${drifted.length}`,
  );

  if (dryRun || pending.length === 0) {
    console.log(dryRun ? '\nDRY-RUN: no se escribió nada.\n' : '\nTodo conciliado.\n');
    await db.end();
    return;
  }

  let updated = 0;
  for (const row of pending) {
    // Sólo se escribe refunded_amount: paid_amount y balance ya traen el descuento.
    const result = await db.query(
      `UPDATE orders SET refunded_amount = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, row.refunds_total],
    );
    updated += result.rowCount ?? 0;
  }

  console.log(`\n✅ Conciliadas ${updated} orden(es). Saldos sin cambios.\n`);

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
