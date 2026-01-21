import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient }  from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

// Use absolute paths for consistent behavior
const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
})

const prisma = new PrismaClient({ adapter });

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

    // Areas
    { name: 'create_areas', description: 'Create new areas' },
    { name: 'read_areas', description: 'View areas' },
    { name: 'update_areas', description: 'Update area information' },
    { name: 'delete_areas', description: 'Delete areas' },

    // Cargos
    { name: 'create_cargos', description: 'Create new cargos' },
    { name: 'read_cargos', description: 'View cargos' },
    { name: 'update_cargos', description: 'Update cargo information' },
    { name: 'delete_cargos', description: 'Delete cargos' },
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
    create: { 
      id: 'b1700ef6-4e33-4c5b-9f4a-a249e59e483f',
      name: 'admin' 
    },
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
    'read_areas',
    'read_cargos',
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
  // 5. Crear Áreas de Ejemplo
  // ============================================
  console.log('\n🏢 Creating areas...');

  const areasData = [
    { name: 'Tecnología', description: 'Área de desarrollo de software y soporte tecnológico' },
    { name: 'Recursos Humanos', description: 'Gestión del talento humano y bienestar organizacional' },
    { name: 'Finanzas', description: 'Gestión contable y financiera de la empresa' },
    { name: 'Comercial', description: 'Ventas y relaciones comerciales' },
    { name: 'Operaciones', description: 'Gestión de procesos operativos' },
  ];

  const areas: { [key: string]: { id: string } } = {};

  for (const areaData of areasData) {
    const area = await prisma.area.upsert({
      where: { name: areaData.name },
      update: { description: areaData.description },
      create: areaData,
    });
    areas[areaData.name] = area;
    console.log(`  ✓ Area: ${areaData.name}`);
  }

  // ============================================
  // 6. Crear Cargos de Ejemplo
  // ============================================
  console.log('\n💼 Creating cargos...');

  const cargosData = [
    // Tecnología
    { name: 'Director de Tecnología', areaName: 'Tecnología', description: 'Líder del área de tecnología' },
    { name: 'Desarrollador Senior', areaName: 'Tecnología', description: 'Desarrollador con experiencia avanzada' },
    { name: 'Desarrollador Junior', areaName: 'Tecnología', description: 'Desarrollador en formación' },
    { name: 'Analista QA', areaName: 'Tecnología', description: 'Control de calidad de software' },
    // Recursos Humanos
    { name: 'Director de RRHH', areaName: 'Recursos Humanos', description: 'Líder del área de recursos humanos' },
    { name: 'Analista de Selección', areaName: 'Recursos Humanos', description: 'Reclutamiento y selección de personal' },
    // Finanzas
    { name: 'Director Financiero', areaName: 'Finanzas', description: 'Líder del área financiera' },
    { name: 'Contador', areaName: 'Finanzas', description: 'Gestión contable' },
    // Comercial
    { name: 'Director Comercial', areaName: 'Comercial', description: 'Líder del área comercial' },
    { name: 'Ejecutivo de Ventas', areaName: 'Comercial', description: 'Gestión de clientes y ventas' },
  ];

  for (const cargoData of cargosData) {
    const area = areas[cargoData.areaName];
    if (area) {
      await prisma.cargo.upsert({
        where: {
          name_areaId: { name: cargoData.name, areaId: area.id },
        },
        update: { description: cargoData.description },
        create: {
          name: cargoData.name,
          description: cargoData.description,
          areaId: area.id,
        },
      });
      console.log(`  ✓ Cargo: ${cargoData.name} (${cargoData.areaName})`);
    }
  }

  // ============================================
  // Resumen
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ Database seeded successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - Permissions: ${permissionsData.length}`);
  console.log(`   - Roles: 3 (admin, manager, user)`);
  console.log(`   - Users: 3`);
  console.log(`   - Areas: ${areasData.length}`);
  console.log(`   - Cargos: ${cargosData.length}`);
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
