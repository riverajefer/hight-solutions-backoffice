import { PrismaClient } from './src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

async function main() {
  const roleId = 'b1700ef6-4e33-4c5b-9f4a-a249e59e483f';
  const permissionName = 'read_audit_logs';

  // Configurar el adaptador para SQLite
  const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log(`Iniciando asignación de permiso "${permissionName}" al rol "${roleId}"...`);

  try {
    // 1. Crear el permiso si no existe
    const permission = await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: {
        name: permissionName,
        description: 'Permite visualizar los logs de auditoría del sistema',
      },
    });

    console.log(`Permiso verificado: ${permission.id}`);

    // 2. Asignar el permiso al rol
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roleId,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: roleId,
        permissionId: permission.id,
      },
    });
    console.log('Permiso asignado correctamente al rol.');
  } catch (error) {
    console.error('Error durante la ejecución:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
