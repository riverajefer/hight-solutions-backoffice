/**
 * Sincroniza los permisos de la aplicación contra la base de datos.
 *
 * Este es el script canónico para publicar permisos en staging y producción.
 * Cada vez que se cree un permiso nuevo en el código (`@RequirePermissions(...)`
 * en el backend y `PERMISSIONS` en `frontend/src/utils/constants.ts`), hay que
 * agregarlo también acá, en el grupo temático que corresponda.
 *
 * Es 100% idempotente y NO destructivo:
 *   - Hace `upsert` de cada permiso (crea o refresca la descripción).
 *   - Asocia los permisos al rol `admin` con `skipDuplicates`.
 *   - NUNCA borra filas de `rolePermission`, a diferencia de `seed.ts`.
 *     Esto es clave: los permisos de los demás roles se administran desde la
 *     UI de Roles y no deben perderse al correr este script.
 *
 * Uso:
 *   # Verificar sin escribir nada
 *   DRY_RUN=1 npm run prisma:sync:permissions
 *
 *   # Aplicar (usa el DATABASE_URL del ambiente cargado)
 *   npm run prisma:sync:permissions
 *
 *   # Apuntando explícitamente a producción
 *   DATABASE_URL="postgresql://..." npx ts-node prisma/sync-permissions.ts
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { permissionGroups, allCatalogPermissions } from './permissions-catalog';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// El catálogo vive aparte para que `seed.ts` publique exactamente los mismos
// permisos: una base nueva se quedaba sin ellos.
const allPermissions = allCatalogPermissions;

async function main() {
  console.log(
    `\n🔐 Sincronizando permisos${DRY_RUN ? ' — MODO DRY RUN, no se escribe nada' : ''}\n`,
  );

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error('Rol "admin" no encontrado. Corre el seed principal primero.');
  }

  const existing = await prisma.permission.findMany({
    where: { name: { in: allPermissions.map((p) => p.name) } },
    select: { id: true, name: true },
  });
  const existingByName = new Map(existing.map((p) => [p.name, p.id]));

  const permissionIds: string[] = [];
  let created = 0;

  for (const group of permissionGroups) {
    console.log(`${group.label}`);
    for (const perm of group.permissions) {
      const isNew = !existingByName.has(perm.name);
      if (isNew) created++;

      if (DRY_RUN) {
        const id = existingByName.get(perm.name);
        if (id) permissionIds.push(id);
      } else {
        const permission = await prisma.permission.upsert({
          where: { name: perm.name },
          update: { description: perm.description },
          create: perm,
        });
        permissionIds.push(permission.id);
      }

      console.log(`   ${isNew ? '+ NUEVO ' : '✓ existe'}  ${perm.name}`);
    }
    console.log('');
  }

  if (DRY_RUN) {
    const alreadyAssigned = await prisma.rolePermission.count({
      where: { roleId: adminRole.id, permissionId: { in: permissionIds } },
    });
    console.log('─'.repeat(60));
    console.log(`Total revisado:        ${allPermissions.length} permisos`);
    console.log(`Se crearían:           ${created}`);
    console.log(
      `Se asignarían a admin: ${allPermissions.length - alreadyAssigned} (ya tiene ${alreadyAssigned})`,
    );
    console.log('\n⚠️  DRY RUN: no se aplicó ningún cambio.\n');
    return;
  }

  const { count: assigned } = await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  console.log('─'.repeat(60));
  console.log(`Total procesado:      ${allPermissions.length} permisos`);
  console.log(`Creados:              ${created}`);
  console.log(`Actualizados:         ${allPermissions.length - created}`);
  console.log(`Asignados al rol admin: ${assigned} (el resto ya los tenía)`);
  console.log(
    '\n✅ Listo. Asigna estos permisos a los demás roles desde la UI de Roles.\n',
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
