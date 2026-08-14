/**
 * Auditoría del uso histórico del saldo a favor (pagos con método CREDIT_BALANCE).
 *
 * SOLO LECTURA: no modifica ningún dato. Usa SQL plano (no el cliente Prisma) para
 * poder correr contra bases que todavía no tienen la migración
 * `add_credit_balance_applications` aplicada.
 *
 * Detecta los dos efectos del bug:
 *   1. El saldo consumido nunca se descontó de la OP de origen, así que sigue
 *      figurando como disponible (se puede volver a gastar o a devolver).
 *   2. El pago generó un movimiento de caja INCOME que infla el arqueo, porque
 *      ese dinero ya había entrado cuando el cliente sobrepagó.
 *
 * Uso:
 *   DATABASE_URL='postgres://...' npx ts-node prisma/audit-credit-balance-usage.ts
 */
import { Client } from 'pg';
import 'dotenv/config';

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

interface CreditPaymentRow {
  payment_id: string;
  amount: string;
  created_at: Date;
  cash_movement_id: string | null;
  movement_voided: boolean | null;
  movement_receipt: string | null;
  session_status: string | null;
  order_id: string;
  order_number: string;
  order_status: string;
  client_id: string;
  client_name: string;
  registered_by: string | null;
  /** true si el consumo ya quedó registrado contra la OP de origen */
  reconciled: boolean;
}

interface OverpaidOrderRow {
  id: string;
  order_number: string;
  status: string;
  total: string;
  paid_amount: string;
  balance: string;
  order_date: Date;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta DATABASE_URL');

  const db = new Client({ connectionString });
  await db.connect();

  const host = new URL(connectionString).host;
  console.log(`Base de datos: ${host}\n`);

  // ── Estado de la migración ────────────────────────────────────────────────
  const { rows: schemaRows } = await db.query<{ has_column: boolean; has_table: boolean }>(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'applied_credit_amount'
      ) AS has_column,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'credit_balance_applications'
      ) AS has_table
  `);
  const { has_column: hasColumn, has_table: hasTable } = schemaRows[0];
  console.log(
    `Migración de saldo a favor aplicada: ${hasColumn && hasTable ? 'SÍ' : 'NO'}` +
      ` (columna=${hasColumn}, tabla=${hasTable})\n`,
  );

  // ── 1. Pagos con saldo a favor ────────────────────────────────────────────
  const { rows: creditPayments } = await db.query<CreditPaymentRow>(`
    SELECT
      p.id            AS payment_id,
      p.amount,
      p.created_at,
      p.cash_movement_id,
      cm.is_voided    AS movement_voided,
      cm.receipt_number AS movement_receipt,
      cs.status       AS session_status,
      o.id            AS order_id,
      o.order_number,
      o.status        AS order_status,
      o.client_id,
      c.name          AS client_name,
      -- La tabla users no usa @map: sus columnas quedaron en camelCase
      NULLIF(TRIM(CONCAT(u."firstName", ' ', u."lastName")), '') AS registered_by,
      ${hasTable
        ? `EXISTS (SELECT 1 FROM credit_balance_applications a WHERE a.payment_id = p.id)`
        : 'false'} AS reconciled
    FROM payments p
    JOIN orders  o  ON o.id = p.order_id
    JOIN clients c  ON c.id = o.client_id
    LEFT JOIN users u ON u.id = p.received_by_id
    LEFT JOIN cash_movements cm ON cm.id = p.cash_movement_id
    LEFT JOIN cash_sessions cs  ON cs.id = cm.cash_session_id
    WHERE p.payment_method = 'CREDIT_BALANCE'
    ORDER BY p.created_at ASC
  `);

  console.log('═'.repeat(78));
  console.log(`1) PAGOS CON SALDO A FAVOR: ${creditPayments.length}`);
  console.log('═'.repeat(78));

  if (creditPayments.length === 0) {
    console.log('\nNo se usó el saldo a favor como método de pago. Nada que sanear.\n');
    await db.end();
    return;
  }

  let consumedTotal = 0;
  for (const row of creditPayments) {
    consumedTotal += Number(row.amount);
    const movement = row.cash_movement_id
      ? ` · caja: ${row.movement_receipt}${row.movement_voided ? ' (ANULADO)' : ` (VIGENTE, sesión ${row.session_status})`}`
      : '';
    console.log(
      `  ${row.created_at.toISOString().slice(0, 10)}  ${row.order_number.padEnd(14)}` +
        `${money(row.amount).padStart(14)}  ${row.client_name}` +
        `${row.registered_by ? ` · por ${row.registered_by}` : ''}${movement}` +
        `${row.reconciled ? ' · CONCILIADO' : ''}`,
    );
  }
  console.log(`\n  Total aplicado con saldo a favor: ${money(consumedTotal)}`);

  // Los pagos ya conciliados no dejan saldo duplicado: quedan fuera del análisis.
  const pending = creditPayments.filter((row) => !row.reconciled);
  const reconciledTotal = creditPayments
    .filter((row) => row.reconciled)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  console.log(
    `  Ya conciliado: ${money(reconciledTotal)}` +
      `  ·  pendiente de conciliar: ${money(consumedTotal - reconciledTotal)}`,
  );

  // ── 2. Movimientos de caja falsos ─────────────────────────────────────────
  const fakeIncome = creditPayments.filter(
    (row) => row.cash_movement_id && !row.movement_voided,
  );
  const fakeIncomeTotal = fakeIncome.reduce((sum, row) => sum + Number(row.amount), 0);

  console.log('\n' + '═'.repeat(78));
  console.log('2) INGRESOS FALSOS EN CAJA (movimiento vigente por un pago sin dinero)');
  console.log('═'.repeat(78));
  if (fakeIncome.length === 0) {
    console.log('\n  Ninguno: no había sesión de caja abierta al registrar esos pagos.\n');
  } else {
    for (const row of fakeIncome) {
      console.log(
        `  ${row.movement_receipt}  ${money(row.amount).padStart(14)}  ` +
          `${row.order_number} · sesión ${row.session_status}`,
      );
    }
    console.log(`\n  Total que infla el arqueo: ${money(fakeIncomeTotal)}`);
  }

  // ── 3. Saldo a favor que quedó duplicado, por cliente ─────────────────────
  const clientIds = [...new Set(pending.map((row) => row.client_id))];

  console.log('\n' + '═'.repeat(78));
  console.log(
    `3) SALDO A FAVOR AÚN DUPLICADO, POR CLIENTE (${clientIds.length} clientes)`,
  );
  console.log('═'.repeat(78));

  let reconcilable = 0;
  let unreconcilable = 0;

  if (clientIds.length === 0) {
    console.log('\n  Todos los consumos están conciliados. Nada duplicado.\n');
  }

  for (const clientId of clientIds) {
    const payments = pending.filter((row) => row.client_id === clientId);
    const clientName = payments[0].client_name;
    const consumed = payments.reduce((sum, row) => sum + Number(row.amount), 0);

    const { rows: overpaid } = await db.query<OverpaidOrderRow>(
      `SELECT id, order_number, status, total, paid_amount, balance, order_date
         FROM orders
        WHERE client_id = $1
          AND balance < 0
          AND status <> 'ANULADO'
        ORDER BY order_date ASC`,
      [clientId],
    );

    const visible = overpaid.reduce((sum, row) => sum + Math.abs(Number(row.balance)), 0);
    const canReconcile = Math.min(consumed, visible);
    reconcilable += canReconcile;
    unreconcilable += consumed - canReconcile;

    console.log(`\n  ${clientName}`);
    console.log(
      `    consumido con saldo a favor: ${money(consumed)}` +
        `   ·   aún visible como disponible: ${money(visible)}`,
    );

    for (const order of overpaid) {
      console.log(
        `      ${order.order_number.padEnd(14)} ${order.status.padEnd(20)}` +
          ` total ${money(order.total).padStart(14)}` +
          ` pagado ${money(order.paid_amount).padStart(14)}` +
          ` a favor ${money(Math.abs(Number(order.balance))).padStart(14)}`,
      );
    }

    if (visible >= consumed) {
      console.log(`    → CONCILIABLE: alcanza para descontar los ${money(consumed)}`);
    } else if (visible > 0) {
      console.log(
        `    → PARCIAL: solo se pueden descontar ${money(visible)};` +
          ` faltan ${money(consumed - visible)} (revisar manualmente)`,
      );
    } else {
      console.log(
        `    → SIN EXCEDENTE VISIBLE: el saldo ya se neutralizó por otra vía` +
          ` (devolución, edición o anulación). Nada que descontar.`,
      );
    }

    // Devoluciones aprobadas sobre esas mismas órdenes: dinero que ya salió
    const { rows: refunds } = await db.query<{
      order_number: string;
      refund_amount: string;
      executed_at: Date | null;
    }>(
      `SELECT o.order_number, r.refund_amount, r.executed_at
         FROM refund_requests r
         JOIN orders o ON o.id = r.order_id
        WHERE o.client_id = $1 AND r.status = 'APPROVED'
        ORDER BY r.executed_at ASC`,
      [clientId],
    );

    for (const refund of refunds) {
      console.log(
        `      ⚠️  devolución en efectivo aprobada ${money(refund.refund_amount)}` +
          ` sobre ${refund.order_number}` +
          `${refund.executed_at ? ` (${refund.executed_at.toISOString().slice(0, 10)})` : ''}`,
      );
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(78));
  console.log('RESUMEN');
  console.log('═'.repeat(78));
  console.log(`  Pagos con saldo a favor:            ${creditPayments.length}`);
  console.log(`  Monto total consumido:              ${money(consumedTotal)}`);
  console.log(`  Ya conciliado:                      ${money(reconciledTotal)}`);
  console.log(`  Conciliable automáticamente:        ${money(reconcilable)}`);
  console.log(`  Requiere revisión manual:           ${money(unreconcilable)}`);
  console.log(`  Ingresos falsos vigentes en caja:   ${money(fakeIncomeTotal)}`);
  console.log('');

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
