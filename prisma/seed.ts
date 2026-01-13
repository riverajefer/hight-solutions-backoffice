import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. Crear Permisos
  // ============================================
  console.log('📝 Creating permissions...');

  const permissionsData = [
    // Users
    { name: 'create_users', description: 'Create new users' },
    { name: 'read_users', description: 'View users' },
    { name: 'update_users', description: 'Update user information' },
    { name: 'delete_users', description: 'Delete users' },

    // Roles
    { name: 'create_roles', description: 'Create new roles' },
    { name: 'read_roles', description: 'View roles' },
    { name: 'update_roles', description: 'Update role information' },
    { name: 'delete_roles', description: 'Delete roles' },

    // Permissions
    { name: 'create_permissions', description: 'Create new permissions' },
    { name: 'read_permissions', description: 'View permissions' },
    { name: 'update_permissions', description: 'Update permission information' },
    { name: 'delete_permissions', description: 'Delete permissions' },
    { name: 'manage_permissions', description: 'Assign/remove permissions to/from roles' },
  ];

  const permissions: { [key: string]: { id: string } } = {};

  for (const perm of permissionsData) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    permissions[perm.name] = permission;
    console.log(`  ✓ Permission: ${perm.name}`);
  }

  // ============================================
  // 2. Crear Roles
  // ============================================
  console.log('\n👥 Creating roles...');

  // Admin Role - tiene todos los permisos
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  console.log(`  ✓ Role: admin`);

  // Manager Role - puede gestionar usuarios pero no roles/permisos
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: { name: 'manager' },
  });
  console.log(`  ✓ Role: manager`);

  // User Role - solo puede leer
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });
  console.log(`  ✓ Role: user`);

  // ============================================
  // 3. Asignar Permisos a Roles
  // ============================================
  console.log('\n🔗 Assigning permissions to roles...');

  // Función helper para asignar permisos
  const assignPermissionsToRole = async (
    roleId: string,
    roleName: string,
    permissionNames: string[],
  ) => {
    // Eliminar permisos existentes
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Asignar nuevos permisos
    for (const permName of permissionNames) {
      if (permissions[permName]) {
        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: permissions[permName].id,
          },
        });
      }
    }
    console.log(`  ✓ ${roleName}: ${permissionNames.length} permissions`);
  };

  // Admin - todos los permisos
  await assignPermissionsToRole(adminRole.id, 'admin', Object.keys(permissions));

  // Manager - gestión de usuarios
  await assignPermissionsToRole(managerRole.id, 'manager', [
    'create_users',
    'read_users',
    'update_users',
    'read_roles',
    'read_permissions',
  ]);

  // User - solo lectura básica
  await assignPermissionsToRole(userRole.id, 'user', [
    'read_users',
    'read_roles',
  ]);

  // ============================================
  // 4. Crear Usuario Admin
  // ============================================
  console.log('\n👤 Creating admin user...');

  const adminPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
      roleId: adminRole.id,
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
    },
  });
  console.log(`  ✓ Admin user: ${adminUser.email}`);

  // Crear usuario de prueba con rol manager
  const managerPassword = await bcrypt.hash('manager123', 12);

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {
      password: managerPassword,
      roleId: managerRole.id,
    },
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      roleId: managerRole.id,
    },
  });
  console.log(`  ✓ Manager user: ${managerUser.email}`);

  // Crear usuario de prueba con rol user
  const userPassword = await bcrypt.hash('user123', 12);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password: userPassword,
      roleId: userRole.id,
    },
    create: {
      email: 'user@example.com',
      password: userPassword,
      roleId: userRole.id,
    },
  });
  console.log(`  ✓ Regular user: ${regularUser.email}`);

  // ============================================
  // Resumen
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ Database seeded successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - Permissions: ${permissionsData.length}`);
  console.log(`   - Roles: 3 (admin, manager, user)`);
  console.log(`   - Users: 3`);
  console.log('\n🔐 Test Credentials:');
  console.log('   Admin:   admin@example.com / admin123');
  console.log('   Manager: manager@example.com / manager123');
  console.log('   User:    user@example.com / user123');
  console.log('='.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
