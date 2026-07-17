/**
 * Publica los permisos de exportación a Excel (`export_*`) de forma idempotente.
 *
 * A diferencia del seed principal, este script NUNCA borra `rolePermission`:
 * solo hace upsert de los permisos y los asocia al rol `admin` con
 * `skipDuplicates`. Es seguro re-correrlo y no descarta los ajustes de permisos
 * hechos desde la UI (importante: dev y staging comparten la misma base).
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const exportPermissions = [
  { name: 'export_orders', description: 'Exportar órdenes de pedido a Excel' },
  {
    name: 'export_accounts_payable',
    description: 'Exportar cuentas por pagar a Excel',
  },
  {
    name: 'export_expense_orders',
    description: 'Exportar órdenes de gasto a Excel',
  },
  { name: 'export_quotes', description: 'Exportar cotizaciones a Excel' },
  {
    name: 'export_work_orders',
    description: 'Exportar órdenes de trabajo a Excel',
  },
  {
    name: 'export_pending_payment_orders',
    description: 'Exportar órdenes pendientes por cobrar a Excel',
  },
  {
    name: 'export_profitability',
    description: 'Exportar rentabilidad por orden a Excel',
  },
  {
    name: 'export_sales_by_advisor',
    description: 'Exportar ventas por asesor a Excel',
  },
  { name: 'export_clients', description: 'Exportar clientes a Excel' },
  { name: 'export_dtf', description: 'Exportar registros DTF a Excel' },
];

async function main() {
  console.log('\n📤 Publicando permisos de exportación...\n');

  const permissionIds: string[] = [];
  for (const perm of exportPermissions) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    permissionIds.push(permission.id);
    console.log(`   ✓ ${perm.name}`);
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error('Rol "admin" no encontrado. Corre el seed principal primero.');
  }

  const { count } = await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  console.log(
    `\n✅ ${exportPermissions.length} permisos listos. ${count} asignados al rol admin (el resto ya los tenía).`,
  );
  console.log(
    '   Asigna los permisos a los demás roles desde la UI de Roles.\n',
  );
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
