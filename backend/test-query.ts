import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();
async function main() {
  const records = await prisma.attendanceRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(JSON.stringify(records, null, 2));
}

main().finally(() => prisma.$disconnect());
