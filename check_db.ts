import { PrismaClient } from './backend/src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const consecutives = await prisma.consecutive.findMany();
  console.log('Consecutives:', JSON.stringify(consecutives, null, 2));

  const latestOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true }
  });
  console.log('Latest Order Number:', latestOrder?.orderNumber);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
