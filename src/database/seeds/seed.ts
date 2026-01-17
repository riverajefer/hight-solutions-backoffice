import { PrismaClient } from '../../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  // Aquí puedes agregar tus datos de seed
  // Ejemplo:
  // await prisma.user.create({
  //   data: {
  //     email: 'admin@example.com',
  //     name: 'Admin',
  //   },
  // });

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
