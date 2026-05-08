import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const records = await prisma.dtfRecord.findMany({
    select: { id: true, createdById: true, createdAt: true },
  });

  if (records.length === 0) {
    console.log('No DTF records found, skipping.');
    return;
  }

  const result = await prisma.dtfStatusHistory.createMany({
    data: records.map((r) => ({
      dtfId: r.id,
      fromStatus: null,
      toStatus: 'BORRADOR' as const,
      changedById: r.createdById,
      changedAt: r.createdAt,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} DTF status history entries (BORRADOR initial state).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
