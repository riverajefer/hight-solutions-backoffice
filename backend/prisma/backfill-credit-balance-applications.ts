/**
 * Backfill de aplicaciones de saldo a favor.
 *
 * Los pagos con método CREDIT_BALANCE registrados antes de esta funcionalidad no
 * descontaron nada de la OP de origen: el excedente seguía figurando como saldo a
 * favor y podía volver a gastarse. Este script recorre esos pagos y registra el
 * consumo contra las OPs con excedente del mismo cliente (FIFO, de la más antigua
 * a la más reciente).
 *
 * Es idempotente: omite los pagos que ya tienen aplicaciones registradas.
 * Si un cliente ya no tiene excedente suficiente (porque el saldo se devolvió o la
 * OP de origen cambió), lo reporta y sigue, sin abortar.
 *
 * Uso:  npx ts-node prisma/backfill-credit-balance-applications.ts
 */
import { PrismaClient, OrderStatus, Prisma } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const payments = await prisma.payment.findMany({
    where: {
      paymentMethod: 'CREDIT_BALANCE',
      creditApplications: { none: {} },
    },
    select: {
      id: true,
      amount: true,
      order: { select: { id: true, orderNumber: true, clientId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Pagos CREDIT_BALANCE sin aplicación registrada: ${payments.length}\n`);

  let applied = 0;
  let skipped = 0;

  for (const payment of payments) {
    let pending = new Prisma.Decimal(payment.amount);

    const candidates = await prisma.order.findMany({
      where: {
        clientId: payment.order.clientId,
        status: { not: OrderStatus.ANULADO },
        id: { not: payment.order.id },
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paidAmount: true,
        appliedCreditAmount: true,
      },
      orderBy: { orderDate: 'asc' },
    });

    const sources = candidates
      .map((order) => ({
        ...order,
        available: new Prisma.Decimal(order.paidAmount)
          .sub(order.total)
          .sub(order.appliedCreditAmount),
      }))
      .filter((source) => source.available.greaterThan(0));

    const available = sources.reduce(
      (sum, source) => sum.add(source.available),
      new Prisma.Decimal(0),
    );

    if (available.lessThan(pending)) {
      console.warn(
        `⚠️  ${payment.order.orderNumber}: se pagaron ${pending.toString()} con saldo a favor ` +
          `pero solo hay ${available.toString()} disponible. Se omite (revisar manualmente).`,
      );
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const source of sources) {
        if (pending.lessThanOrEqualTo(0)) break;

        const taken = Prisma.Decimal.min(pending, source.available);

        await tx.creditBalanceApplication.create({
          data: {
            paymentId: payment.id,
            sourceOrderId: source.id,
            amount: taken,
          },
        });

        const newApplied = new Prisma.Decimal(source.appliedCreditAmount).add(taken);

        await tx.order.update({
          where: { id: source.id },
          data: {
            appliedCreditAmount: newApplied,
            balance: new Prisma.Decimal(source.total)
              .sub(source.paidAmount)
              .add(newApplied),
          },
        });

        console.log(
          `✅ ${payment.order.orderNumber} consume ${taken.toString()} del saldo a favor de ${source.orderNumber}`,
        );

        pending = pending.sub(taken);
      }
    });

    applied++;
  }

  console.log(`\nListo. Pagos conciliados: ${applied}. Omitidos: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
