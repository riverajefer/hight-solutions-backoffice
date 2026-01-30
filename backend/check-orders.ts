import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  const orders = await prisma.order.findMany({
    include: {
      client: true,
      items: true,
      payments: true,
    },
  });

  console.log(`\n📦 Total orders in database: ${orders.length}\n`);

  orders.forEach((order, index) => {
    console.log(`${index + 1}. Order: ${order.orderNumber}`);
    console.log(`   Client: ${order.client.name}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: $${order.total}`);
    console.log(`   Items: ${order.items.length}`);
    console.log(`   Payments: ${order.payments.length}`);
    console.log(`   Balance: $${order.balance}\n`);
  });

  await prisma.$disconnect();
}

checkOrders();
