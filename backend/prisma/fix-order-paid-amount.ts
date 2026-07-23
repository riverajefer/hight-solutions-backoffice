/**
 * Repara órdenes cuyo `paidAmount` / `balance` no coinciden con la suma real de
 * sus pagos.
 *
 * Causa: al rechazar un anticipo, el servicio forzaba `paidAmount = 0` y
 * `balance = total` en lugar de recalcular a partir de los pagos que sobreviven
 * (corregido en advance-payment-approvals.service.ts). Las órdenes que ya
 * quedaron con datos inconsistentes necesitan esta reparación puntual.
 *
 * Uso:
 *   npx ts-node prisma/fix-order-paid-amount.ts            # dry-run (no escribe)
 *   npx ts-node prisma/fix-order-paid-amount.ts --apply    # aplica los cambios
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const APPLY = process.argv.includes('--apply');

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paidAmount: true,
      balance: true,
      payments: { select: { amount: true } },
    },
  });

  const inconsistent = orders
    .map((order) => {
      const realPaid = order.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const total = new Prisma.Decimal(order.total);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        storedPaid: new Prisma.Decimal(order.paidAmount),
        storedBalance: new Prisma.Decimal(order.balance),
        realPaid,
        realBalance: total.sub(realPaid),
      };
    })
    .filter(
      (row) =>
        !row.storedPaid.equals(row.realPaid) ||
        !row.storedBalance.equals(row.realBalance),
    );

  console.log(`Órdenes revisadas: ${orders.length}`);
  console.log(`Órdenes inconsistentes: ${inconsistent.length}\n`);

  for (const row of inconsistent) {
    console.log(
      `${row.orderNumber}: abono ${row.storedPaid} → ${row.realPaid} | ` +
        `saldo ${row.storedBalance} → ${row.realBalance}`,
    );
  }

  if (!inconsistent.length) return;

  if (!APPLY) {
    console.log('\nDry-run. Ejecuta con --apply para guardar los cambios.');
    return;
  }

  for (const row of inconsistent) {
    await prisma.order.update({
      where: { id: row.id },
      data: { paidAmount: row.realPaid, balance: row.realBalance },
    });
  }

  console.log(`\n${inconsistent.length} orden(es) actualizada(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
