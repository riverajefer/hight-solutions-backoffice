/**
 * Publica los permisos del Pipeline de Ventas (prospectos) de forma idempotente.
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

const prospectPermissions = [
  { name: 'create_prospects', description: 'Crear prospectos' },
  { name: 'read_prospects', description: 'Ver prospectos' },
  {
    name: 'read_all_prospects',
    description: 'Ver los prospectos de todas las vendedoras (no solo los propios)',
  },
  {
    name: 'update_prospects',
    description: 'Actualizar prospectos y registrar contactos',
  },
  { name: 'delete_prospects', description: 'Eliminar prospectos' },
  {
    name: 'convert_prospects',
    description: 'Convertir prospectos a cotización u orden',
  },
  { name: 'export_prospects', description: 'Exportar prospectos a Excel' },
  {
    name: 'read_prospect_metrics',
    description: 'Ver métricas del pipeline de ventas por vendedora',
  },
];

async function main() {
  console.log('\n📈 Publicando permisos del Pipeline de Ventas...\n');

  const permissionIds: string[] = [];
  for (const perm of prospectPermissions) {
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
    `\n✅ ${prospectPermissions.length} permisos listos. ${count} asignados al rol admin (el resto ya los tenía).`,
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
