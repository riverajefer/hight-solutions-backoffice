import { PrismaClient, OrderStatus, QuoteStatus } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
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
    {
      name: 'update_permissions',
      description: 'Update permission information',
    },
    { name: 'delete_permissions', description: 'Delete permissions' },
    {
      name: 'manage_permissions',
      description: 'Assign/remove permissions to/from roles',
    },

    // Areas
    { name: 'create_areas', description: 'Create new areas' },
    { name: 'read_areas', description: 'View areas' },
    { name: 'update_areas', description: 'Update area information' },
    { name: 'delete_areas', description: 'Delete areas' },

    // Production Areas (CRUD)
    { name: 'create_production_areas', description: 'Create new production areas' },
    { name: 'read_production_areas', description: 'View production areas' },
    { name: 'update_production_areas', description: 'Update production area information' },
    { name: 'delete_production_areas', description: 'Delete production areas' },

    // Cargos
    { name: 'create_cargos', description: 'Create new cargos' },
    { name: 'read_cargos', description: 'View cargos' },
    { name: 'update_cargos', description: 'Update cargo information' },
    { name: 'delete_cargos', description: 'Delete cargos' },

    // Audit Logs
    { name: 'read_audit_logs', description: 'View audit logs' },

    // Clients
    { name: 'create_clients', description: 'Create new clients' },
    { name: 'read_clients', description: 'View clients (used by selectors and API)' },
    { name: 'browse_clients', description: 'Acceder a la tabla completa de clientes (/clients)' },
    { name: 'update_clients', description: 'Update client information' },
    { name: 'delete_clients', description: 'Delete clients' },
    {
      name: 'update_client_special_condition',
      description: 'Editar condición especial del cliente',
    },

    // Suppliers
    { name: 'create_suppliers', description: 'Create new suppliers' },
    { name: 'read_suppliers', description: 'View suppliers' },
    { name: 'update_suppliers', description: 'Update supplier information' },
    { name: 'delete_suppliers', description: 'Delete suppliers' },

    // Session Logs
    {
      name: 'read_session_logs',
      description: 'Ver registros de inicio y cierre de sesión de usuarios',
    },

    // Attendance (Control de Asistencia)
    {
      name: 'use_attendance',
      description: 'Marcar entrada y salida de asistencia',
    },
    {
      name: 'read_attendance',
      description: 'Ver registros de asistencia de todos los usuarios',
    },
    {
      name: 'manage_attendance',
      description: 'Ajustar/corregir registros de asistencia',
    },

    // Inventory Movements (Movimientos de Inventario)
    {
      name: 'create_inventory_movements',
      description: 'Crear movimientos de inventario manualmente (entradas, ajustes, devoluciones)',
    },
    {
      name: 'read_inventory_movements',
      description: 'Ver movimientos de inventario, alertas de stock bajo y valoración',
    },
    {
      name: 'manage_inventory',
      description: 'Gestionar inventario: recibir alertas de stock bajo y supervisar existencias',
    },

    // Units of Measure
    {
      name: 'create_units_of_measure',
      description: 'Crear unidades de medida',
    },
    { name: 'read_units_of_measure', description: 'Ver unidades de medida' },
    {
      name: 'update_units_of_measure',
      description: 'Actualizar unidades de medida',
    },
    {
      name: 'delete_units_of_measure',
      description: 'Eliminar unidades de medida',
    },

    // Product Categories
    {
      name: 'create_product_categories',
      description: 'Crear categorías de productos',
    },
    {
      name: 'read_product_categories',
      description: 'Ver categorías de productos',
    },
    {
      name: 'update_product_categories',
      description: 'Actualizar categorías de productos',
    },
    {
      name: 'delete_product_categories',
      description: 'Eliminar categorías de productos',
    },

    // Products
    { name: 'create_products', description: 'Crear productos' },
    { name: 'read_products', description: 'Ver productos' },
    { name: 'update_products', description: 'Actualizar productos' },
    { name: 'delete_products', description: 'Eliminar productos' },

    // Supply Categories
    {
      name: 'create_supply_categories',
      description: 'Crear categorías de insumos',
    },
    {
      name: 'read_supply_categories',
      description: 'Ver categorías de insumos',
    },
    {
      name: 'update_supply_categories',
      description: 'Actualizar categorías de insumos',
    },
    {
      name: 'delete_supply_categories',
      description: 'Eliminar categorías de insumos',
    },

    // Supplies
    { name: 'create_supplies', description: 'Crear insumos' },
    { name: 'read_supplies', description: 'Ver insumos' },
    { name: 'update_supplies', description: 'Actualizar insumos' },
    { name: 'delete_supplies', description: 'Eliminar insumos' },

    // Orders
    { name: 'create_orders', description: 'Crear órdenes de pedido' },
    { name: 'read_orders', description: 'Ver órdenes de pedido' },
    { name: 'update_orders', description: 'Actualizar órdenes de pedido' },
    { name: 'delete_orders', description: 'Eliminar órdenes de pedido' },
    {
      name: 'approve_orders',
      description: 'Aprobar/rechazar solicitudes de cambio de estado de órdenes',
    },
    {
      name: 'change_order_status',
      description: 'Cambiar el estado de una orden de pedido directamente',
    },
    {
      name: 'apply_discounts',
      description: 'Aplicar descuentos a órdenes',
    },
    {
      name: 'delete_discounts',
      description: 'Eliminar descuentos de órdenes',
    },
    {
      name: 'read_pending_orders',
      description: 'Ver órdenes pendientes de pago',
    },

    // Commercial Channels
    {
      name: 'create_commercial_channels',
      description: 'Crear canales de venta',
    },
    { name: 'read_commercial_channels', description: 'Ver canales de venta' },
    {
      name: 'update_commercial_channels',
      description: 'Actualizar canales de venta',
    },
    {
      name: 'delete_commercial_channels',
      description: 'Eliminar canales de venta',
    },

    // Quotes
    { name: 'create_quotes', description: 'Crear cotizaciones' },
    { name: 'read_quotes', description: 'Ver cotizaciones' },
    { name: 'update_quotes', description: 'Actualizar cotizaciones' },
    { name: 'delete_quotes', description: 'Eliminar cotizaciones' },
    { name: 'convert_quotes', description: 'Convertir cotizaciones a órdenes' },

    // Storage (File Upload/Management)
    { name: 'upload_files', description: 'Subir archivos al sistema' },
    { name: 'read_files', description: 'Ver y descargar archivos' },
    { name: 'delete_files', description: 'Eliminar archivos' },
    { name: 'manage_storage', description: 'Gestión completa de almacenamiento' },

    // Company (Información institucional)
    { name: 'read_company', description: 'Ver información de la compañía' },
    { name: 'update_company', description: 'Editar información de la compañía' },

    // Work Orders (Órdenes de Trabajo)
    { name: 'create_work_orders', description: 'Crear órdenes de trabajo' },
    { name: 'read_work_orders', description: 'Ver órdenes de trabajo' },
    { name: 'update_work_orders', description: 'Actualizar órdenes de trabajo' },
    { name: 'delete_work_orders', description: 'Eliminar órdenes de trabajo' },

    // Expense Types (Tipos de Gasto)
    { name: 'create_expense_types', description: 'Crear tipos de gasto' },
    { name: 'read_expense_types', description: 'Ver tipos de gasto' },
    { name: 'update_expense_types', description: 'Actualizar tipos de gasto' },
    { name: 'delete_expense_types', description: 'Eliminar tipos de gasto' },

    // Expense Orders (Órdenes de Gastos)
    { name: 'create_expense_orders', description: 'Crear órdenes de gasto' },
    { name: 'read_expense_orders', description: 'Ver órdenes de gasto' },
    { name: 'update_expense_orders', description: 'Actualizar órdenes de gasto' },
    { name: 'delete_expense_orders', description: 'Eliminar órdenes de gasto' },
    { name: 'approve_expense_orders', description: 'Aprobar/marcar como pagada una OG' },

    // Advance Payment Approvals
    { name: 'approve_advance_payments', description: 'Aprobar/rechazar anticipos de órdenes' },

    // Client Ownership Authorization
    { name: 'approve_client_ownership_auth', description: 'Aprobar solicitudes de autorización de propiedad de cliente en órdenes' },

    // Payroll Employees (Nómina)
    { name: 'create_payroll_employees', description: 'Agregar usuarios a nómina' },
    { name: 'read_payroll_employees', description: 'Ver empleados de nómina' },
    { name: 'update_payroll_employees', description: 'Editar empleados de nómina' },
    { name: 'delete_payroll_employees', description: 'Eliminar empleados de nómina' },

    // Payroll Periods (Periodos de Nómina)
    { name: 'create_payroll_periods', description: 'Crear periodos de nómina' },
    { name: 'read_payroll_periods', description: 'Ver periodos de nómina' },
    { name: 'update_payroll_periods', description: 'Editar periodos de nómina' },
    { name: 'delete_payroll_periods', description: 'Eliminar periodos de nómina' },
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
      name: 'admin',
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

  // Caja Role - gestión de pagos y anticipos
  const cajaRole = await prisma.role.upsert({
    where: { name: 'caja' },
    update: {},
    create: { name: 'caja', description: 'Rol de Caja - Gestión de pagos y anticipos' },
  });
  console.log(`  ✓ Role: caja`);

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
  await assignPermissionsToRole(
    adminRole.id,
    'admin',
    Object.keys(permissions),
  );

  // Manager - gestión de usuarios y lectura de clientes/proveedores
  await assignPermissionsToRole(managerRole.id, 'manager', [
    'create_users',
    'read_users',
    'update_users',
    'read_roles',
    'read_permissions',
    'read_areas',
    'read_cargos',
    'read_clients',
    'browse_clients',
    'read_suppliers',
    'read_units_of_measure',
    'read_product_categories',
    'read_products',
    'read_supply_categories',
    'read_supplies',
    'create_orders',
    'read_orders',
    'update_orders',
    'approve_orders',
    'change_order_status',
    'apply_discounts',
    // Quotes (Manager)
    'create_quotes',
    'read_quotes',
    'update_quotes',
    'convert_quotes',
    // Work Orders (Manager)
    'create_work_orders',
    'read_work_orders',
    'update_work_orders',
    // Expense Types (Manager)
    'read_expense_types',
    // Expense Orders (Manager)
    'create_expense_orders',
    'read_expense_orders',
    'update_expense_orders',
    // Attendance (Manager)
    'use_attendance',
    'read_attendance',
    // Inventory (Manager)
    'read_inventory_movements',
    'create_inventory_movements',
    'manage_inventory',
  ]);

  // User - solo lectura básica
  await assignPermissionsToRole(userRole.id, 'user', [
    'read_users',
    'read_roles',
    'read_orders',
    // Attendance (User)
    'use_attendance',
  ]);

  // Caja - gestión de pagos y anticipos
  await assignPermissionsToRole(cajaRole.id, 'caja', [
    'approve_advance_payments',
    'read_orders',
    'read_clients',
    'read_users',
    'read_roles',
    'read_products',
    'read_production_areas',
    'read_commercial_channels',
    'read_pending_orders',
    // Attendance (Caja)
    'use_attendance',
  ]);

  // ============================================
  // 4. Crear Usuario Admin
  // ============================================
  console.log('\n👤 Creating admin user...');

  const adminPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { username: 'adminsistema' },
    update: {
      username: 'adminsistema',
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'Sistema',
    },
    create: {
      username: 'adminsistema',
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'Sistema',
    },
  });
  console.log(`  ✓ Admin user: ${adminUser.username}`);

  // Crear usuario de prueba con rol manager
  const managerPassword = await bcrypt.hash('manager123', 12);

  const managerUser = await prisma.user.upsert({
    where: { username: 'managersistema' },
    update: {
      username: 'managersistema',
      email: 'manager@example.com',
      password: managerPassword,
      roleId: managerRole.id,
      firstName: 'Manager',
      lastName: 'Sistema',
    },
    create: {
      username: 'managersistema',
      email: 'manager@example.com',
      password: managerPassword,
      roleId: managerRole.id,
      firstName: 'Manager',
      lastName: 'Sistema',
    },
  });
  console.log(`  ✓ Manager user: ${managerUser.username}`);

  // Crear usuario de prueba con rol user
  const userPassword = await bcrypt.hash('user123', 12);

  const regularUser = await prisma.user.upsert({
    where: { username: 'usuariosistema' },
    update: {
      username: 'usuariosistema',
      email: 'user@example.com',
      password: userPassword,
      roleId: userRole.id,
      firstName: 'Usuario',
      lastName: 'Sistema',
    },
    create: {
      username: 'usuariosistema',
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Usuario',
      lastName: 'Sistema',
      roleId: userRole.id,
    },
  });
  console.log(`  ✓ Regular user: ${regularUser.username}`);

  // ============================================
  // 5. Crear Áreas de Ejemplo
  // ============================================
  console.log('\n🏢 Creating areas...');

  const areasData = [
    {
      name: 'Tecnología',
      description: 'Área de desarrollo de software y soporte tecnológico',
    },
    {
      name: 'Recursos Humanos',
      description: 'Gestión del talento humano y bienestar organizacional',
    },
    {
      name: 'Finanzas',
      description: 'Gestión contable y financiera de la empresa',
    },
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
    {
      name: 'Director de Tecnología',
      areaName: 'Tecnología',
      description: 'Líder del área de tecnología',
    },
    {
      name: 'Desarrollador Senior',
      areaName: 'Tecnología',
      description: 'Desarrollador con experiencia avanzada',
    },
    {
      name: 'Desarrollador Junior',
      areaName: 'Tecnología',
      description: 'Desarrollador en formación',
    },
    {
      name: 'Analista QA',
      areaName: 'Tecnología',
      description: 'Control de calidad de software',
    },
    // Recursos Humanos
    {
      name: 'Director de RRHH',
      areaName: 'Recursos Humanos',
      description: 'Líder del área de recursos humanos',
    },
    {
      name: 'Analista de Selección',
      areaName: 'Recursos Humanos',
      description: 'Reclutamiento y selección de personal',
    },
    // Finanzas
    {
      name: 'Director Financiero',
      areaName: 'Finanzas',
      description: 'Líder del área financiera',
    },
    { name: 'Contador', areaName: 'Finanzas', description: 'Gestión contable' },
    // Comercial
    {
      name: 'Director Comercial',
      areaName: 'Comercial',
      description: 'Líder del área comercial',
    },
    {
      name: 'Ejecutivo de Ventas',
      areaName: 'Comercial',
      description: 'Gestión de clientes y ventas',
    },
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
  // 7. Crear Departamentos y Ciudades de Colombia
  // ============================================
  console.log('\n🇨🇴 Creating Colombian departments and cities...');

  const departmentsData = [
    { name: 'Amazonas', code: 'AMA', cities: ['Leticia', 'Puerto Nariño'] },
    {
      name: 'Antioquia',
      code: 'ANT',
      cities: [
        'Medellín',
        'Envigado',
        'Bello',
        'Itagüí',
        'Rionegro',
        'Sabaneta',
        'La Estrella',
        'Apartadó',
      ],
    },
    {
      name: 'Arauca',
      code: 'ARA',
      cities: ['Arauca', 'Tame', 'Saravena', 'Fortul'],
    },
    {
      name: 'Atlántico',
      code: 'ATL',
      cities: [
        'Barranquilla',
        'Soledad',
        'Malambo',
        'Sabanalarga',
        'Puerto Colombia',
      ],
    },
    {
      name: 'Bolívar',
      code: 'BOL',
      cities: [
        'Cartagena',
        'Magangué',
        'Turbaco',
        'El Carmen de Bolívar',
        'Arjona',
      ],
    },
    {
      name: 'Boyacá',
      code: 'BOY',
      cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
    },
    {
      name: 'Caldas',
      code: 'CAL',
      cities: ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Anserma'],
    },
    {
      name: 'Caquetá',
      code: 'CAQ',
      cities: [
        'Florencia',
        'San Vicente del Caguán',
        'Puerto Rico',
        'El Doncello',
      ],
    },
    {
      name: 'Casanare',
      code: 'CAS',
      cities: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo'],
    },
    {
      name: 'Cauca',
      code: 'CAU',
      cities: [
        'Popayán',
        'Santander de Quilichao',
        'Puerto Tejada',
        'Piendamó',
      ],
    },
    {
      name: 'Cesar',
      code: 'CES',
      cities: [
        'Valledupar',
        'Aguachica',
        'Codazzi',
        'Bosconia',
        'La Jagua de Ibirico',
      ],
    },
    {
      name: 'Chocó',
      code: 'CHO',
      cities: ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Riosucio'],
    },
    {
      name: 'Córdoba',
      code: 'COR',
      cities: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Planeta Rica'],
    },
    {
      name: 'Cundinamarca',
      code: 'CUN',
      cities: [
        'Bogotá',
        'Soacha',
        'Chía',
        'Zipaquirá',
        'Facatativá',
        'Girardot',
        'Fusagasugá',
        'Madrid',
      ],
    },
    { name: 'Guainía', code: 'GUA', cities: ['Inírida'] },
    {
      name: 'Guaviare',
      code: 'GUV',
      cities: ['San José del Guaviare', 'El Retorno', 'Calamar'],
    },
    {
      name: 'Huila',
      code: 'HUI',
      cities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre'],
    },
    {
      name: 'La Guajira',
      code: 'LAG',
      cities: ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar'],
    },
    {
      name: 'Magdalena',
      code: 'MAG',
      cities: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato'],
    },
    {
      name: 'Meta',
      code: 'MET',
      cities: [
        'Villavicencio',
        'Acacías',
        'Granada',
        'Puerto López',
        'San Martín',
      ],
    },
    {
      name: 'Nariño',
      code: 'NAR',
      cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión'],
    },
    {
      name: 'Norte de Santander',
      code: 'NSA',
      cities: [
        'Cúcuta',
        'Ocaña',
        'Pamplona',
        'Los Patios',
        'Villa del Rosario',
      ],
    },
    {
      name: 'Putumayo',
      code: 'PUT',
      cities: [
        'Mocoa',
        'Puerto Asís',
        'Orito',
        'Valle del Guamuez',
        'Villagarzón',
      ],
    },
    {
      name: 'Quindío',
      code: 'QUI',
      cities: ['Armenia', 'Calarcá', 'Montenegro', 'La Tebaida', 'Circasia'],
    },
    {
      name: 'Risaralda',
      code: 'RIS',
      cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'],
    },
    {
      name: 'San Andrés y Providencia',
      code: 'SAP',
      cities: ['San Andrés', 'Providencia'],
    },
    {
      name: 'Santander',
      code: 'SAN',
      cities: [
        'Bucaramanga',
        'Floridablanca',
        'Girón',
        'Piedecuesta',
        'Barrancabermeja',
        'San Gil',
      ],
    },
    {
      name: 'Sucre',
      code: 'SUC',
      cities: ['Sincelejo', 'Corozal', 'San Marcos', 'Sampués', 'Tolú'],
    },
    {
      name: 'Tolima',
      code: 'TOL',
      cities: [
        'Ibagué',
        'Espinal',
        'Melgar',
        'Mariquita',
        'Honda',
        'Chaparral',
      ],
    },
    {
      name: 'Valle del Cauca',
      code: 'VAC',
      cities: [
        'Cali',
        'Buenaventura',
        'Palmira',
        'Tuluá',
        'Buga',
        'Cartago',
        'Yumbo',
        'Jamundí',
      ],
    },
    { name: 'Vaupés', code: 'VAU', cities: ['Mitú', 'Carurú', 'Taraira'] },
    {
      name: 'Vichada',
      code: 'VIC',
      cities: ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo'],
    },
  ];

  let totalCities = 0;

  for (const deptData of departmentsData) {
    // Create or update department
    const department = await prisma.department.upsert({
      where: { code: deptData.code },
      update: { name: deptData.name },
      create: {
        name: deptData.name,
        code: deptData.code,
      },
    });

    // Create cities for this department
    for (const cityName of deptData.cities) {
      await prisma.city.upsert({
        where: {
          name_departmentId: { name: cityName, departmentId: department.id },
        },
        update: {},
        create: {
          name: cityName,
          departmentId: department.id,
        },
      });
      totalCities++;
    }

    console.log(`  ✓ ${deptData.name}: ${deptData.cities.length} cities`);
  }

  // ============================================
  // 6. Crear Unidades de Medida
  // ============================================
  console.log('\n📏 Creating units of measure...');

  const unitsOfMeasureData = [
    {
      name: 'metro',
      abbreviation: 'm',
      description: 'Unidad de longitud del sistema internacional',
    },
    {
      name: 'metro cuadrado',
      abbreviation: 'm²',
      description: 'Unidad de superficie o área',
    },
    {
      name: 'litro',
      abbreviation: 'L',
      description: 'Unidad de volumen',
    },
    {
      name: 'mililitro',
      abbreviation: 'ml',
      description: 'Unidad de volumen (milésima de litro)',
    },
    {
      name: 'kilogramo',
      abbreviation: 'kg',
      description: 'Unidad de masa',
    },
    {
      name: 'gramo',
      abbreviation: 'g',
      description: 'Unidad de masa (milésima de kilogramo)',
    },
    {
      name: 'unidad',
      abbreviation: 'und',
      description: 'Unidad discreta para conteo de elementos',
    },
    {
      name: 'docena',
      abbreviation: 'doc',
      description: 'Conjunto de 12 unidades',
    },
    {
      name: 'ciento',
      abbreviation: 'cto',
      description: 'Conjunto de 100 unidades',
    },
    {
      name: 'millar',
      abbreviation: 'mill',
      description: 'Conjunto de 1000 unidades',
    },
    {
      name: 'rollo',
      abbreviation: 'rollo',
      description: 'Presentación enrollada de material',
    },
    {
      name: 'caja',
      abbreviation: 'caja',
      description: 'Presentación en caja contenedora',
    },
    {
      name: 'paquete',
      abbreviation: 'pqt',
      description: 'Presentación en paquete',
    },
    {
      name: 'pliego',
      abbreviation: 'plg',
      description: 'Unidad de papel o material plano',
    },
  ];

  for (const unitData of unitsOfMeasureData) {
    await prisma.unitOfMeasure.upsert({
      where: { name: unitData.name },
      update: {
        abbreviation: unitData.abbreviation,
        description: unitData.description,
      },
      create: unitData,
    });
    console.log(`  ✓ Unit: ${unitData.name} (${unitData.abbreviation})`);
  }

  // ============================================
  // 7. Crear Categorías de Productos
  // ============================================
  console.log('\n📦 Creating product categories...');

  const productCategoriesData = [
    {
      name: 'Impresión Gran Formato',
      slug: 'impresion-gran-formato',
      description:
        'Productos de impresión en gran formato como pendones, banners y vallas',
      icon: '🖨️',
      sortOrder: 1,
    },
    {
      name: 'Promocionales',
      slug: 'promocionales',
      description:
        'Artículos promocionales personalizados: gorras, lapiceros, vasos, etc.',
      icon: '🎁',
      sortOrder: 2,
    },
    {
      name: 'Papelería',
      slug: 'papeleria',
      description:
        'Productos de papelería corporativa: tarjetas, cuadernos, volantes',
      icon: '📄',
      sortOrder: 3,
    },
    {
      name: 'Señalización',
      slug: 'senalizacion',
      description: 'Señalización corporativa e industrial',
      icon: '🚦',
      sortOrder: 4,
    },
  ];

  for (const categoryData of productCategoriesData) {
    await prisma.productCategory.upsert({
      where: { slug: categoryData.slug },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        sortOrder: categoryData.sortOrder,
      },
      create: categoryData,
    });
    console.log(`  ✓ Category: ${categoryData.name}`);
  }

  // ============================================
  // 8. Crear Productos de Prueba
  // ============================================
  console.log('\n🛠️ Creating products...');

  // Obtener categorías para usar sus IDs
  const impresionCategory = await prisma.productCategory.findUnique({
    where: { slug: 'impresion-gran-formato' },
  });
  const promocionalesCategory = await prisma.productCategory.findUnique({
    where: { slug: 'promocionales' },
  });
  const papeleriaCategory = await prisma.productCategory.findUnique({
    where: { slug: 'papeleria' },
  });
  const senalizacionCategory = await prisma.productCategory.findUnique({
    where: { slug: 'senalizacion' },
  });

  const productsData = [
    // Impresión Gran Formato
    {
      name: 'Pendón 80x200 cm',
      slug: 'pendon-80x200-cm',
      description:
        'Impresión de pendón en lona mate de alta calidad con estructura metálica',
      basePrice: 45000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Pendón 100x200 cm',
      slug: 'pendon-100x200-cm',
      description:
        'Impresión de pendón en lona mate de alta calidad con estructura metálica',
      basePrice: 55000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Banner 1x2 metros',
      slug: 'banner-1x2-metros',
      description:
        'Banner impreso en lona brillante con ojales para instalación',
      basePrice: 35000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Valla Publicitaria 3x2 metros',
      slug: 'valla-publicitaria-3x2-metros',
      description:
        'Impresión de valla publicitaria en lona reforzada con bastidores',
      basePrice: 280000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Pasacalle 1x5 metros',
      slug: 'pasacalle-1x5-metros',
      description: 'Pasacalle en lona reforzada con ojales y cuerda',
      basePrice: 85000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },

    // Promocionales
    {
      name: 'Gorras Bordadas',
      slug: 'gorras-bordadas',
      description: 'Gorras de gabardina con logo bordado personalizado',
      basePrice: 18000,
      priceUnit: 'por unidad',
      categoryId: promocionalesCategory?.id,
    },
    {
      name: 'Lapiceros Personalizados',
      slug: 'lapiceros-personalizados',
      description: 'Lapiceros plásticos con logo impreso',
      basePrice: 1200,
      priceUnit: 'por unidad',
      categoryId: promocionalesCategory?.id,
    },
    {
      name: 'Termos Metálicos',
      slug: 'termos-metalicos',
      description: 'Termos de acero inoxidable 500ml con logo grabado',
      basePrice: 35000,
      priceUnit: 'por unidad',
      categoryId: promocionalesCategory?.id,
    },
    {
      name: 'USB Personalizados 8GB',
      slug: 'usb-personalizados-8gb',
      description: 'Memorias USB 8GB con logo impreso',
      basePrice: 12000,
      priceUnit: 'por unidad',
      categoryId: promocionalesCategory?.id,
    },
    {
      name: 'Agendas Corporativas',
      slug: 'agendas-corporativas',
      description: 'Agendas tamaño carta con logo estampado en tapa',
      basePrice: 22000,
      priceUnit: 'por unidad',
      categoryId: promocionalesCategory?.id,
    },

    // Papelería
    {
      name: 'Tarjetas de Presentación x 1000',
      slug: 'tarjetas-presentacion-x-1000',
      description: 'Tarjetas de presentación propalcote 300gr a full color',
      basePrice: 75000,
      priceUnit: 'por millar',
      categoryId: papeleriaCategory?.id,
    },
    {
      name: 'Volantes Carta x 1000',
      slug: 'volantes-carta-x-1000',
      description: 'Volantes tamaño carta en propalcote 150gr a full color',
      basePrice: 120000,
      priceUnit: 'por millar',
      categoryId: papeleriaCategory?.id,
    },
    {
      name: 'Carpetas Corporativas x 100',
      slug: 'carpetas-corporativas-x-100',
      description: 'Carpetas tamaño carta en cartulina 240gr plastificadas',
      basePrice: 180000,
      priceUnit: 'por ciento',
      categoryId: papeleriaCategory?.id,
    },
    {
      name: 'Stickers Troquelados x 100',
      slug: 'stickers-troquelados-x-100',
      description: 'Stickers personalizados con corte según diseño',
      basePrice: 45000,
      priceUnit: 'por ciento',
      categoryId: papeleriaCategory?.id,
    },
    {
      name: 'Sellos Automáticos',
      slug: 'sellos-automaticos',
      description: 'Sello automático personalizado con tinta',
      basePrice: 28000,
      priceUnit: 'por unidad',
      categoryId: papeleriaCategory?.id,
    },

    // Señalización
    {
      name: 'Letrero Acrílico con Luz LED',
      slug: 'letrero-acrilico-con-luz-led',
      description: 'Letrero en acrílico 3mm con iluminación LED perimetral',
      basePrice: 15000,
      priceUnit: 'por metro lineal',
      categoryId: senalizacionCategory?.id,
    },
    {
      name: 'Señal de Seguridad 30x40 cm',
      slug: 'senal-seguridad-30x40-cm',
      description: 'Señalización de seguridad industrial en reflectivo',
      basePrice: 22000,
      priceUnit: 'por unidad',
      categoryId: senalizacionCategory?.id,
    },
    {
      name: 'Aviso Institucional en Dibond',
      slug: 'aviso-institucional-dibond',
      description: 'Aviso institucional impreso sobre dibond 3mm',
      basePrice: 85000,
      priceUnit: 'por metro cuadrado',
      categoryId: senalizacionCategory?.id,
    },
    {
      name: 'Letras Corpóreas en PVC',
      slug: 'letras-corporeas-pvc',
      description: 'Letras corpóreas en PVC de 10mm de espesor',
      basePrice: 12000,
      priceUnit: 'por centímetro de altura',
      categoryId: senalizacionCategory?.id,
    },
  ];

  let productsCreated = 0;
  for (const productData of productsData) {
    if (productData.categoryId) {
      await prisma.product.upsert({
        where: { slug: productData.slug },
        update: {
          name: productData.name,
          description: productData.description,
          basePrice: productData.basePrice,
          priceUnit: productData.priceUnit,
        },
        create: {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          basePrice: productData.basePrice,
          priceUnit: productData.priceUnit,
          categoryId: productData.categoryId,
        },
      });
      console.log(`  ✓ Product: ${productData.name}`);
      productsCreated++;
    }
  }

  // ============================================
  // 9. Crear Categorías de Insumos
  // ============================================
  console.log('\n📦 Creating supply categories...');

  const supplyCategoriesData = [
    {
      name: 'Telas y Lonas',
      slug: 'telas-y-lonas',
      description: 'Materiales textiles y lonas para impresión gran formato',
      icon: '🧵',
      sortOrder: 1,
    },
    {
      name: 'Tintas',
      slug: 'tintas',
      description: 'Tintas para impresoras de gran formato y sublimación',
      icon: '🎨',
      sortOrder: 2,
    },
    {
      name: 'Productos Base',
      slug: 'productos-base',
      description:
        'Artículos base para personalización (gorras, termos, lapiceros, etc.)',
      icon: '📦',
      sortOrder: 3,
    },
    {
      name: 'Papelería y Cartón',
      slug: 'papeleria-y-carton',
      description:
        'Papel, cartulina, cartón corrugado y materiales para impresión',
      icon: '📄',
      sortOrder: 4,
    },
    {
      name: 'Materiales Rígidos',
      slug: 'materiales-rigidos',
      description: 'Acrílico, PVC, dibond y otros materiales rígidos',
      icon: '🔲',
      sortOrder: 5,
    },
    {
      name: 'Consumibles',
      slug: 'consumibles',
      description: 'Adhesivos, cintas, cuerdas y otros consumibles',
      icon: '🔧',
      sortOrder: 6,
    },
  ];

  for (const categoryData of supplyCategoriesData) {
    await prisma.supplyCategory.upsert({
      where: { slug: categoryData.slug },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        sortOrder: categoryData.sortOrder,
      },
      create: categoryData,
    });
    console.log(`  ✓ Category: ${categoryData.name}`);
  }

  // ============================================
  // 10. Crear Insumos de Prueba
  // ============================================
  console.log('\n📦 Creating supplies...');

  // Obtener categorías de insumos
  const telasCategory = await prisma.supplyCategory.findUnique({
    where: { slug: 'telas-y-lonas' },
  });
  const tintasCategory = await prisma.supplyCategory.findUnique({
    where: { slug: 'tintas' },
  });
  const productosBaseCategory = await prisma.supplyCategory.findUnique({
    where: { slug: 'productos-base' },
  });
  const papeleriaCategorySupplies = await prisma.supplyCategory.findUnique({
    where: { slug: 'papeleria-y-carton' },
  });
  const materialesRigidosCategory = await prisma.supplyCategory.findUnique({
    where: { slug: 'materiales-rigidos' },
  });

  // Obtener unidades de medida
  const metroUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'metro' },
  });
  const metrosCuadradosUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'metro cuadrado' },
  });
  const litroUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'litro' },
  });
  const kilogramoUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'kilogramo' },
  });
  const unidadUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'unidad' },
  });
  const pliegoUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'pliego' },
  });
  const cajaUnit = await prisma.unitOfMeasure.findUnique({
    where: { name: 'caja' },
  });

  const suppliesData = [
    // Telas y Lonas
    {
      name: 'Lona Mate 13 oz',
      sku: 'LM-13OZ',
      description: 'Lona mate de 13 onzas para impresión de alta calidad',
      categoryId: telasCategory?.id,
      purchasePrice: 25000,
      purchaseUnitId: metroUnit?.id,
      consumptionUnitId: metrosCuadradosUnit?.id,
      conversionFactor: 1.5,
      currentStock: 150,
      minimumStock: 50,
    },
    {
      name: 'Lona Brillante 10 oz',
      sku: 'LB-10OZ',
      description: 'Lona brillante de 10 onzas para uso exterior',
      categoryId: telasCategory?.id,
      purchasePrice: 20000,
      purchaseUnitId: metroUnit?.id,
      consumptionUnitId: metrosCuadradosUnit?.id,
      conversionFactor: 1.5,
      currentStock: 80,
      minimumStock: 30,
    },

    // Tintas
    {
      name: 'Tinta Ecosolvente Negra',
      sku: 'TECO-BLACK-1L',
      description: 'Tinta ecosolvente negra para impresoras gran formato',
      categoryId: tintasCategory?.id,
      purchasePrice: 85000,
      purchaseUnitId: litroUnit?.id,
      consumptionUnitId: litroUnit?.id,
      conversionFactor: 1,
      currentStock: 25,
      minimumStock: 10,
    },
    {
      name: 'Tinta Ecosolvente Cyan',
      sku: 'TECO-CYAN-1L',
      description: 'Tinta ecosolvente cyan para impresoras gran formato',
      categoryId: tintasCategory?.id,
      purchasePrice: 85000,
      purchaseUnitId: litroUnit?.id,
      consumptionUnitId: litroUnit?.id,
      conversionFactor: 1,
      currentStock: 20,
      minimumStock: 10,
    },

    // Productos Base
    {
      name: 'Gorras Gabardina Blancas',
      sku: 'GORRA-GAB-WHT',
      description: 'Gorras de gabardina color blanco para personalización',
      categoryId: productosBaseCategory?.id,
      purchasePrice: 8000,
      purchaseUnitId: unidadUnit?.id,
      consumptionUnitId: unidadUnit?.id,
      conversionFactor: 1,
      currentStock: 200,
      minimumStock: 50,
    },
    {
      name: 'Lapiceros Plásticos',
      sku: 'LAP-PLAS-BLU',
      description: 'Lapiceros plásticos azules para personalización',
      categoryId: productosBaseCategory?.id,
      purchasePrice: 800,
      purchaseUnitId: unidadUnit?.id,
      consumptionUnitId: unidadUnit?.id,
      conversionFactor: 1,
      currentStock: 1000,
      minimumStock: 200,
    },

    // Papelería y Cartón
    {
      name: 'Propalcote 300 gr',
      sku: 'PROP-300',
      description: 'Papel propalcote 300 gramos para tarjetas',
      categoryId: papeleriaCategorySupplies?.id,
      purchasePrice: 45000,
      purchaseUnitId: pliegoUnit?.id,
      consumptionUnitId: pliegoUnit?.id,
      conversionFactor: 1,
      currentStock: 500,
      minimumStock: 100,
    },
    {
      name: 'Cartulina Bristol 240 gr',
      sku: 'BRIS-240',
      description: 'Cartulina bristol 240 gramos para carpetas',
      categoryId: papeleriaCategorySupplies?.id,
      purchasePrice: 35000,
      purchaseUnitId: pliegoUnit?.id,
      consumptionUnitId: pliegoUnit?.id,
      conversionFactor: 1,
      currentStock: 300,
      minimumStock: 80,
    },

    // Materiales Rígidos
    {
      name: 'Acrílico 3mm Transparente',
      sku: 'ACR-3MM-TRA',
      description: 'Lámina de acrílico transparente de 3mm',
      categoryId: materialesRigidosCategory?.id,
      purchasePrice: 95000,
      purchaseUnitId: metrosCuadradosUnit?.id,
      consumptionUnitId: metrosCuadradosUnit?.id,
      conversionFactor: 1,
      currentStock: 25,
      minimumStock: 10,
    },
    {
      name: 'PVC Espumado 10mm',
      sku: 'PVC-10MM',
      description: 'Plancha de PVC espumado de 10mm',
      categoryId: materialesRigidosCategory?.id,
      purchasePrice: 75000,
      purchaseUnitId: metrosCuadradosUnit?.id,
      consumptionUnitId: metrosCuadradosUnit?.id,
      conversionFactor: 1,
      currentStock: 30,
      minimumStock: 15,
    },
  ];

  let suppliesCreated = 0;
  for (const supplyData of suppliesData) {
    if (
      supplyData.categoryId &&
      supplyData.purchaseUnitId &&
      supplyData.consumptionUnitId
    ) {
      await prisma.supply.upsert({
        where: { sku: supplyData.sku },
        update: {
          name: supplyData.name,
          description: supplyData.description,
          purchasePrice: supplyData.purchasePrice,
          conversionFactor: supplyData.conversionFactor,
          currentStock: supplyData.currentStock,
          minimumStock: supplyData.minimumStock,
        },
        create: {
          name: supplyData.name,
          sku: supplyData.sku,
          description: supplyData.description,
          purchasePrice: supplyData.purchasePrice,
          conversionFactor: supplyData.conversionFactor,
          currentStock: supplyData.currentStock,
          minimumStock: supplyData.minimumStock,
          category: { connect: { id: supplyData.categoryId } },
          purchaseUnit: { connect: { id: supplyData.purchaseUnitId } },
          consumptionUnit: { connect: { id: supplyData.consumptionUnitId } },
        },
      });
      console.log(`  ✓ Supply: ${supplyData.name}`);
      suppliesCreated++;
    }
  }

  // ============================================
  // 10. Crear Clientes de Prueba
  // ============================================
  console.log('\n👥 Creating test clients...');

  // Obtener ciudades para los clientes
  const bogota = await prisma.city.findFirst({ where: { name: 'Bogotá' } });
  const medellin = await prisma.city.findFirst({ where: { name: 'Medellín' } });
  const cali = await prisma.city.findFirst({ where: { name: 'Cali' } });
  const barranquilla = await prisma.city.findFirst({
    where: { name: 'Barranquilla' },
  });
  const cartagena = await prisma.city.findFirst({
    where: { name: 'Cartagena' },
  });

  const clientsData = [
    {
      name: 'Distribuidora El Sol S.A.S',
      email: 'contacto@distribuidoraelsol.com',
      phone: '3101234567',
      address: 'Calle 72 # 10-34',
      personType: 'EMPRESA' as const,
      nit: '900123456-7',
      cityId: bogota?.id,
      departmentId: bogota?.departmentId,
    },
    {
      name: 'María Fernanda López',
      email: 'mafe.lopez@gmail.com',
      phone: '3209876543',
      address: 'Carrera 43A # 12-15',
      personType: 'NATURAL' as const,
      cityId: medellin?.id,
      departmentId: medellin?.departmentId,
    },
    {
      name: 'Publicidad Creativa Ltda',
      email: 'ventas@publicidadcreativa.com',
      phone: '3156781234',
      address: 'Avenida 5N # 23-50',
      personType: 'EMPRESA' as const,
      nit: '800987654-3',
      cityId: cali?.id,
      departmentId: cali?.departmentId,
    },
    {
      name: 'Juan Carlos Martínez',
      email: 'jcmartinez@hotmail.com',
      phone: '3187654321',
      address: 'Calle 84 # 50-12',
      personType: 'NATURAL' as const,
      cityId: barranquilla?.id,
      departmentId: barranquilla?.departmentId,
    },
    {
      name: 'Eventos y Ferias del Caribe',
      email: 'info@eventosyferias.com',
      phone: '3145678901',
      address: 'Centro Histórico, Calle del Arsenal',
      personType: 'EMPRESA' as const,
      nit: '890123789-5',
      cityId: cartagena?.id,
      departmentId: cartagena?.departmentId,
    },
    {
      name: 'Laura Sofía Ramírez',
      email: 'laurasofia.r@gmail.com',
      phone: '3198765432',
      address: 'Carrera 15 # 93-40',
      personType: 'NATURAL' as const,
      cityId: bogota?.id,
      departmentId: bogota?.departmentId,
    },
    {
      name: 'Impresiones Digitales Colombia',
      email: 'digital@impresionescol.com',
      phone: '3167890123',
      address: 'Calle 10 # 40-66',
      personType: 'EMPRESA' as const,
      nit: '901234567-8',
      cityId: medellin?.id,
      departmentId: medellin?.departmentId,
    },
    {
      name: 'Andrés Felipe Castro',
      email: 'afcastro@outlook.com',
      phone: '3124567890',
      address: 'Carrera 100 # 15-25',
      personType: 'NATURAL' as const,
      cityId: cali?.id,
      departmentId: cali?.departmentId,
    },
    {
      name: 'Agencia de Marketing Innovador',
      email: 'contacto@marketinginnovador.co',
      phone: '3203456789',
      address: 'Calle 53 # 45-10',
      personType: 'EMPRESA' as const,
      nit: '800345678-9',
      cityId: bogota?.id,
      departmentId: bogota?.departmentId,
    },
    {
      name: 'Camila Andrea Vargas',
      email: 'camila.vargas@yahoo.com',
      phone: '3189012345',
      address: 'Avenida Boyacá # 80-20',
      personType: 'NATURAL' as const,
      cityId: barranquilla?.id,
      departmentId: barranquilla?.departmentId,
    },
  ];

  let clientsCreated = 0;
  for (const clientData of clientsData) {
    if (clientData.cityId && clientData.departmentId) {
      const { ...dataToCreate } = clientData;
      await prisma.client.upsert({
        where: { email: clientData.email },
        update: dataToCreate as any,
        create: dataToCreate as any,
      });
      clientsCreated++;
      console.log(`  ✓ Client: ${clientData.name}`);
    }
  }

  // ============================================
  // 11. Crear Proveedores de Prueba
  // ============================================
  console.log('\n🏭 Creating test suppliers...');

  const pereira = await prisma.city.findFirst({ where: { name: 'Pereira' } });
  const bucaramanga = await prisma.city.findFirst({
    where: { name: 'Bucaramanga' },
  });

  const suppliersData = [
    {
      name: 'Tintas y Colores S.A.',
      email: 'ventas@tintasycolores.com',
      phone: '3101122334',
      address: 'Zona Industrial Calle 13 # 68-50',
      personType: 'EMPRESA' as const,
      nit: '890456789-1',
      cityId: bogota?.id,
      departmentId: bogota?.departmentId,
    },
    {
      name: 'Papelería Industrial Medellín',
      email: 'contacto@papeleriaindustrial.com',
      phone: '3142233445',
      address: 'Carrera 50 # 30-15',
      personType: 'EMPRESA' as const,
      nit: '800567890-2',
      cityId: medellin?.id,
      departmentId: medellin?.departmentId,
    },
    {
      name: 'Acrílicos y Plásticos del Valle',
      email: 'info@acrilicosyvalle.com',
      phone: '3183344556',
      address: 'Zona Franca Calle 15 # 100-20',
      personType: 'EMPRESA' as const,
      nit: '900678901-3',
      cityId: cali?.id,
      departmentId: cali?.departmentId,
    },
    {
      name: 'Textiles y Confecciones del Norte',
      email: 'ventas@textilesyconfecciones.com',
      phone: '3124455667',
      address: 'Calle 45 # 20-30',
      personType: 'EMPRESA' as const,
      nit: '800789012-4',
      cityId: barranquilla?.id,
      departmentId: barranquilla?.departmentId,
    },
    {
      name: 'Maderas y Acabados Premium',
      email: 'contacto@maderaspremium.com',
      phone: '3165566778',
      address: 'Avenida del Río # 35-40',
      personType: 'EMPRESA' as const,
      nit: '890890123-5',
      cityId: pereira?.id,
      departmentId: pereira?.departmentId,
    },
    {
      name: 'Suministros Gráficos Express',
      email: 'express@suministrosgraficos.com',
      phone: '3206677889',
      address: 'Carrera 27 # 45-10',
      personType: 'EMPRESA' as const,
      nit: '900901234-6',
      cityId: bucaramanga?.id,
      departmentId: bucaramanga?.departmentId,
    },
    {
      name: 'Vinilos y Adhesivos Colombia',
      email: 'ventas@vinilosyadhesivos.co',
      phone: '3147788990',
      address: 'Calle 26 # 68-90',
      personType: 'EMPRESA' as const,
      nit: '800012345-7',
      cityId: bogota?.id,
      departmentId: bogota?.departmentId,
    },
    {
      name: 'Metales y Estructuras del Sur',
      email: 'info@metalesdelsur.com',
      phone: '3188899001',
      address: 'Zona Industrial Sur Km 5',
      personType: 'EMPRESA' as const,
      nit: '890123456-8',
      cityId: cali?.id,
      departmentId: cali?.departmentId,
    },
    {
      name: 'Empaques y Cajas del Atlántico',
      email: 'contacto@empaquesycajas.com',
      phone: '3129900112',
      address: 'Carrera 38 # 74-50',
      personType: 'EMPRESA' as const,
      nit: '900234567-9',
      cityId: barranquilla?.id,
      departmentId: barranquilla?.departmentId,
    },
    {
      name: 'Tecnología de Impresión Digital',
      email: 'ventas@tecimpresion.com',
      phone: '3160011223',
      address: 'Calle 70A # 50-20',
      personType: 'EMPRESA' as const,
      nit: '800345678-0',
      cityId: medellin?.id,
      departmentId: medellin?.departmentId,
    },
  ];

  let suppliersCreated = 0;
  for (const supplierData of suppliersData) {
    if (supplierData.cityId && supplierData.departmentId) {
      const { ...dataToCreate } = supplierData;
      await prisma.supplier.upsert({
        where: { email: supplierData.email },
        update: dataToCreate as any,
        create: dataToCreate as any,
      });
      suppliersCreated++;
      console.log(`  ✓ Supplier: ${supplierData.name}`);
    }
  }

  // ============================================
  // 12. Crear Órdenes de Prueba
  // ============================================
  console.log('\n📦 Creating test orders...');

  // Obtener algunos clientes y productos para las órdenes
  const client1 = await prisma.client.findFirst({
    where: { email: 'contacto@distribuidoraelsol.com' },
  });
  const client2 = await prisma.client.findFirst({
    where: { email: 'ventas@publicidadcreativa.com' },
  });

  const tarjetasProduct = await prisma.product.findFirst({
    where: { slug: 'tarjetas-presentacion-x-1000' },
  });
  const bannerProduct = await prisma.product.findFirst({
    where: { slug: 'banner-1x2-metros' },
  });
  const sellosProduct = await prisma.product.findFirst({
    where: { slug: 'sellos-automaticos' },
  });

  const adminUserForOrders = await prisma.user.findFirst({
    where: { username: 'adminsistema' },
  });

  // Obtener canales de venta y áreas de producción para las órdenes
  const channelWhatsApp = await prisma.commercialChannel.findFirst({ where: { name: 'WhatsApp' } });
  const channelCorporativo = await prisma.commercialChannel.findFirst({ where: { name: 'Clientes Corporativos' } });
  const channelTiendaFisica = await prisma.commercialChannel.findFirst({ where: { name: 'Tienda Física' } });

  const areaPapeleria = await prisma.productionArea.findFirst({ where: { name: 'Papeleria' } });
  const areaPloter = await prisma.productionArea.findFirst({ where: { name: 'Ploter gran formato' } });
  const areaPromocionales = await prisma.productionArea.findFirst({ where: { name: 'Promocionales' } });
  const areaDiseño = await prisma.productionArea.findFirst({ where: { name: 'Diseño' } });
  const areaCostura = await prisma.productionArea.findFirst({ where: { name: 'Costura' } });

  // Orden 1: CONFIRMED con IVA, canal WhatsApp, items con áreas de producción
  if (client1 && tarjetasProduct && bannerProduct && adminUserForOrders) {
    const existingOrder1 = await prisma.order.findFirst({
      where: { orderNumber: 'OP-2026-0001' },
    });
    if (!existingOrder1) {
      const order1 = await prisma.order.create({
        data: {
          orderNumber: 'OP-2026-0001',
          orderDate: new Date('2026-01-15'),
          deliveryDate: new Date('2026-05-25'),
          status: 'CONFIRMED',
          notes: 'Cliente solicita colores corporativos: azul y blanco',
          subtotal: 450000,
          taxRate: 0.19,
          tax: 85500,
          discountAmount: 0,
          total: 535500,
          paidAmount: 200000,
          balance: 335500,
          clientId: client1.id,
          createdById: adminUserForOrders.id,
          ...(channelWhatsApp && {
            commercialChannelId: channelWhatsApp.id,
          }),
          items: {
            create: [
              {
                description:
                  'Tarjetas de presentación full color, papel propalcote 300gr',
                quantity: 1000,
                unitPrice: 250000,
                total: 250000,
                sortOrder: 1,
                productId: tarjetasProduct.id,
                specifications: {
                  material: 'Propalcote 300gr',
                  tamaño: '9x5 cm',
                  acabado: 'Laminado mate',
                  colores: 'Full color (4x4)',
                },
                ...(areaPapeleria && {
                  productionAreas: {
                    create: [{ productionAreaId: areaPapeleria.id }],
                  },
                }),
              },
              {
                description: 'Banner publicitario 1x2 metros',
                quantity: 10,
                unitPrice: 20000,
                total: 200000,
                sortOrder: 2,
                productId: bannerProduct.id,
                specifications: {
                  material: 'Lona mate 13oz',
                  tamaño: '1x2 metros',
                  impresion: 'Full color',
                },
                ...(areaPloter && {
                  productionAreas: {
                    create: [{ productionAreaId: areaPloter.id }],
                  },
                }),
              },
            ],
          },
          payments: {
            create: {
              amount: 200000,
              paymentMethod: 'TRANSFER',
              paymentDate: new Date('2026-01-15'),
              reference: 'TRANSF-001-2026',
              notes: 'Abono inicial 40%',
              receivedById: adminUserForOrders.id,
            },
          },
        },
      });
      console.log(`  ✓ Order: ${order1.orderNumber} - ${order1.status}`);
    } else {
      console.log(`  ↩ Order already exists: OP-2026-0001`);
    }
  }

  // Orden 2: IN_PRODUCTION con IVA, factura electrónica, canal Corporativo, áreas de producción
  if (client2 && sellosProduct && tarjetasProduct && adminUserForOrders) {
    const existingOrder2 = await prisma.order.findFirst({
      where: { orderNumber: 'OP-2026-0002' },
    });
    if (!existingOrder2) {
      const order2 = await prisma.order.create({
        data: {
          orderNumber: 'OP-2026-0002',
          orderDate: new Date('2026-01-18'),
          deliveryDate: new Date('2026-04-28'),
          status: 'IN_PRODUCTION',
          notes: 'Entrega urgente.',
          subtotal: 850000,
          taxRate: 0.19,
          tax: 161500,
          discountAmount: 0,
          total: 1011500,
          paidAmount: 800000,
          balance: 211500,
          electronicInvoiceNumber: 'FE-2026-00001',
          clientId: client2.id,
          createdById: adminUserForOrders.id,
          ...(channelCorporativo && {
            commercialChannelId: channelCorporativo.id,
          }),
          items: {
            create: [
              {
                description: 'Sellos automáticos empresariales con logo',
                quantity: 5,
                unitPrice: 80000,
                total: 400000,
                sortOrder: 1,
                productId: sellosProduct.id,
                specifications: {
                  tipo: 'Automático Trodat 4913',
                  tamaño: '58x22 mm',
                  tinta: 'Negro',
                  incluye: 'Logo + texto personalizado',
                },
                ...(areaDiseño && {
                  productionAreas: {
                    create: [{ productionAreaId: areaDiseño.id }],
                  },
                }),
              },
              {
                description: 'Tarjetas de presentación premium doble cara',
                quantity: 1500,
                unitPrice: 300,
                total: 450000,
                sortOrder: 2,
                productId: tarjetasProduct.id,
                specifications: {
                  material: 'Cartulina Bristol 240gr',
                  tamaño: '9x5 cm',
                  acabado: 'Laminado UV brillante',
                  colores: 'Full color doble cara (4x4)',
                  extras: 'Stamping dorado',
                },
                ...(areaPapeleria && {
                  productionAreas: {
                    create: [{ productionAreaId: areaPapeleria.id }],
                  },
                }),
              },
            ],
          },
          payments: {
            create: [
              {
                amount: 500000,
                paymentMethod: 'TRANSFER',
                paymentDate: new Date('2026-01-18'),
                reference: 'TRANSF-002-2026',
                notes: 'Abono inicial 50%',
                receivedById: adminUserForOrders.id,
              },
              {
                amount: 300000,
                paymentMethod: 'CARD',
                paymentDate: new Date('2026-01-22'),
                reference: 'CARD-003-2026',
                notes: 'Segundo abono',
                receivedById: adminUserForOrders.id,
              },
            ],
          },
        },
      });
      console.log(`  ✓ Order: ${order2.orderNumber} - ${order2.status} (con factura electrónica: FE-2026-00001)`);
    } else {
      console.log(`  ↩ Order already exists: OP-2026-0002`);
    }
  }

  // Orden 3: SIN IVA — canal Tienda Física, área de producción Promocionales + Costura
  if (client1 && adminUserForOrders) {
    const existingOrder3 = await prisma.order.findFirst({
      where: { orderNumber: 'OP-2026-0003' },
    });
    if (!existingOrder3) {
      const order3 = await prisma.order.create({
        data: {
          orderNumber: 'OP-2026-0003',
          orderDate: new Date('2026-01-20'),
          deliveryDate: new Date('2026-03-30'),
          status: 'READY',
          notes: 'Orden sin IVA. No aplica factura electrónica.',
          subtotal: 300000,
          taxRate: 0,
          tax: 0,
          discountAmount: 0,
          total: 300000,
          paidAmount: 300000,
          balance: 0,
          clientId: client1.id,
          createdById: adminUserForOrders.id,
          ...(channelTiendaFisica && {
            commercialChannelId: channelTiendaFisica.id,
          }),
          items: {
            create: [
              {
                description: 'Gorras bordadas sin IVA',
                quantity: 10,
                unitPrice: 30000,
                total: 300000,
                sortOrder: 1,
                specifications: {
                  color: 'Negro',
                  logo: 'Bordado frontal',
                },
                productionAreas: {
                  create: [
                    ...(areaPromocionales ? [{ productionAreaId: areaPromocionales.id }] : []),
                    ...(areaCostura ? [{ productionAreaId: areaCostura.id }] : []),
                  ],
                },
              },
            ],
          },
          payments: {
            create: {
              amount: 300000,
              paymentMethod: 'CASH',
              paymentDate: new Date('2026-01-20'),
              reference: 'EFVO-001-2026',
              notes: 'Pago completo en efectivo',
              receivedById: adminUserForOrders.id,
            },
          },
        },
      });
      console.log(`  ✓ Order: ${order3.orderNumber} - ${order3.status} (sin IVA)`);
    } else {
      console.log(`  ↩ Order already exists: OP-2026-0003`);
    }
  }

  // ============================================
  // 13. Crear Cotizaciones de Prueba
  // ============================================
  console.log('\n📄 Creating test quotes...');

  let quotesCreatedCount = 0;
  if (client1 && client2 && tarjetasProduct && bannerProduct && adminUserForOrders) {
    const quotesToCreateData = [
      {
        quoteNumber: 'COT-2026-0001',
        clientId: client1.id,
        quoteDate: new Date('2026-02-01'),
        validUntil: new Date('2026-03-01'),
        subtotal: 150000,
        taxRate: 0.19,
        tax: 28500,
        total: 178500,
        status: QuoteStatus.SENT,
        notes: 'Cotización inicial para papelería corporativa',
        createdById: adminUserForOrders.id,
        items: [
          {
            description: 'Tarjetas de presentación x 1000',
            quantity: 2,
            unitPrice: 75000,
            total: 150000,
            productId: tarjetasProduct.id,
            sortOrder: 1,
            productionAreas: areaPapeleria ? [areaPapeleria.id] : [],
          }
        ]
      },
      {
        quoteNumber: 'COT-2026-0002',
        clientId: client2.id,
        quoteDate: new Date('2026-02-05'),
        validUntil: new Date('2026-03-05'),
        subtotal: 350000,
        taxRate: 0.19,
        tax: 66500,
        total: 416500,
        status: QuoteStatus.ACCEPTED,
        notes: 'Cliente aceptó vía correo electrónico',
        createdById: adminUserForOrders.id,
        items: [
          {
            description: 'Banner 1x2 metros',
            quantity: 10,
            unitPrice: 35000,
            total: 350000,
            productId: bannerProduct.id,
            sortOrder: 1,
            productionAreas: areaPloter ? [areaPloter.id] : [],
          }
        ]
      }
    ];

    for (const quoteData of quotesToCreateData) {
      const existingQuote = await prisma.quote.findFirst({
        where: { quoteNumber: quoteData.quoteNumber },
      });

      if (!existingQuote) {
        const { items, ...quoteBaseData } = quoteData;
        const quote = await prisma.quote.create({
          data: {
            ...quoteBaseData,
            items: {
              create: items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
                productId: item.productId,
                sortOrder: item.sortOrder,
                productionAreas: {
                  create: item.productionAreas.map(areaId => ({
                    productionAreaId: areaId
                  }))
                }
              }))
            }
          }
        });
        console.log(`  ✓ Quote: ${quote.quoteNumber} - ${quote.status}`);
        quotesCreatedCount++;
      } else {
        console.log(`  ↩ Quote already exists: ${quoteData.quoteNumber}`);
      }
    }
  }

  // ============================================
  // 14. Crear Consecutivos Iniciales
  // ============================================
  console.log('\n🔢 Creating initial consecutives...');

  const consecutivesData = [
    {
      type: 'ORDER',
      prefix: 'OP',
      year: new Date().getFullYear(),
      lastNumber: 3,
    },
    {
      type: 'PRODUCTION',
      prefix: 'PROD',
      year: new Date().getFullYear(),
      lastNumber: 0,
    },
    {
      type: 'EXPENSE',
      prefix: 'GAS',
      year: new Date().getFullYear(),
      lastNumber: 0,
    },
    {
      type: 'QUOTE',
      prefix: 'COT',
      year: new Date().getFullYear(),
      lastNumber: 2,
    },
    {
      type: 'WORK_ORDER',
      prefix: 'OT',
      year: new Date().getFullYear(),
      lastNumber: 0,
    },
  ];

  for (const consecutive of consecutivesData) {
    await prisma.consecutive.upsert({
      where: { type: consecutive.type },
      update: {
        lastNumber: consecutive.lastNumber,
      },
      create: consecutive,
    });
    console.log(`  ✓ Consecutive: ${consecutive.type} (${consecutive.prefix})`);
  }

  // ============================================
  // 18. Crear Áreas de Producción
  // ============================================
  console.log('\n🏭 Creating production areas...');

  const productionAreasData = [
    {
      name: 'DTF UV',
      description: 'Área especializada en impresión DTF con tecnología UV',
    },
    { name: 'DTF Textil', description: 'Área de impresión DTF para textiles' },
    { name: 'Calandra', description: 'Área de calandrado y acabados térmicos' },
    { name: 'Sublimación', description: 'Área de sublimación textil' },
    { name: 'Rigidos', description: 'Área de impresión en materiales rígidos' },
    { name: 'Lanyard', description: 'Área de fabricación de lanyards' },
    { name: 'Papeleria', description: 'Área de producción de papelería' },
    { name: 'Costura', description: 'Área de costura y confección' },
    {
      name: 'Ploter gran formato',
      description: 'Área de impresión en gran formato',
    },
    { name: 'Promocionales', description: 'Área de productos promocionales' },
    { name: 'Diseño', description: 'Área de diseño gráfico y creativo' },
    { name: 'Producción High', description: 'Área de producción de alta gama' },
    {
      name: 'Producción Externa',
      description: 'Área de gestión de producción externa',
    },
  ];

  for (const productionAreaData of productionAreasData) {
    await prisma.productionArea.upsert({
      where: { name: productionAreaData.name },
      update: { description: productionAreaData.description },
      create: productionAreaData,
    });
    console.log(`  ✓ Production Area: ${productionAreaData.name}`);
  }

  // ============================================
  // 14. Crear Canales de Venta (Commercial Channels)
  // ============================================
  console.log('\n🛒 Creating commercial channels...');

  const commercialChannelsData = [
    {
      name: 'Tienda Física',
      description: 'Ventas realizadas en nuestras tiendas físicas',
    },
    {
      name: 'Tienda Online',
      description: 'Ventas a través del sitio web y plataforma e-commerce',
    },
    {
      name: 'WhatsApp',
      description: 'Ventas realizadas por pedidos vía WhatsApp',
    },
    {
      name: 'Redes Sociales',
      description:
        'Ventas generadas desde Facebook, Instagram y otras redes sociales',
    },
    {
      name: 'Marketplace',
      description: 'Ventas en plataformas como Mercado Libre, Amazon, etc.',
    },
    {
      name: 'Distribuidores',
      description: 'Ventas a través de nuestra red de distribuidores',
    },
    {
      name: 'Clientes Corporativos',
      description: 'Ventas directas a empresas y contratos corporativos',
    },
  ];

  let channelsCreated = 0;
  for (const channelData of commercialChannelsData) {
    await prisma.commercialChannel.upsert({
      where: { name: channelData.name },
      update: { description: channelData.description },
      create: channelData,
    });
    console.log(`  ✓ Channel: ${channelData.name}`);
    channelsCreated++;
  }

  // ============================================
  // 15. Crear Estados Editables de Órdenes
  // ============================================
  console.log('\n🔧 Creating editable order statuses...');

  const editableStatuses = [
    {
      orderStatus: OrderStatus.DRAFT,
      allowEditRequests: false,
      description: 'Borrador - ya es editable sin solicitud',
    },
    {
      orderStatus: OrderStatus.CONFIRMED,
      allowEditRequests: true,
      description: 'Confirmada - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.IN_PRODUCTION,
      allowEditRequests: true,
      description: 'En producción - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.READY,
      allowEditRequests: true,
      description: 'Lista - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.DELIVERED,
      allowEditRequests: true,
      description: 'Entregada - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.DELIVERED_ON_CREDIT,
      allowEditRequests: true,
      description: 'Entregado a crédito - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.WARRANTY,
      allowEditRequests: true,
      description: 'Garantía - requiere solicitud de edición',
    },
    {
      orderStatus: OrderStatus.PAID,
      allowEditRequests: false,
      description: 'Pagada - no se puede editar',
    },
  ];

  for (const status of editableStatuses) {
    await prisma.editableOrderStatus.upsert({
      where: { orderStatus: status.orderStatus },
      update: status,
      create: status,
    });
    console.log(
      `  ✓ ${status.orderStatus}: ${status.allowEditRequests ? 'Allow requests' : 'No requests'}`,
    );
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
  // ============================================
  // Company - Información institucional inicial
  // ============================================
  console.log('\n🏢 Creating company info...');

  await prisma.company.upsert({
    where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    update: {},
    create: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'High Solutions S.A.S',
      description: 'Empresa especializada en soluciones de software y tecnología empresarial.',
      email: 'contacto@highsolutions.com',
      phone: '6012345678',
      mobilePhone: '3001234567',
      website: 'https://www.highsolutions.com',
      address: 'Bogotá, Colombia',
      nit: '900000000-0',
      legalRepresentative: 'Representante Legal',
      foundedYear: 2020,
      taxRegime: 'Régimen Simple de Tributación',
    },
  });
  console.log('  ✓ Company info created');

  console.log(`   - Cargos: ${cargosData.length}`);
  console.log(`   - Departments: ${departmentsData.length}`);
  console.log(`   - Cities: ${totalCities}`);
  console.log(`   - Clients: ${clientsCreated}`);
  console.log(`   - Suppliers: ${suppliersCreated}`);
  console.log(`   - Units of Measure: ${unitsOfMeasureData.length}`);
  console.log(`   - Product Categories: ${productCategoriesData.length}
   - Products: ${productsCreated}
   - Quotes: ${quotesCreatedCount} / 2 expected`);
  console.log(`   - Supply Categories: ${supplyCategoriesData.length}`);
  console.log(`   - Supplies: ${suppliesCreated}`);
  console.log(`   - Orders: 3 (2 con IVA, 1 sin IVA)`);
  // ============================================
  // Expense Types & Subcategories
  // ============================================
  console.log('\n💸 Creating expense types and subcategories...');

  const expenseTypesData = [
    {
      name: 'Operativos',
      description: 'Gastos necesarios para el funcionamiento diario',
      subcategories: [
        'Insumos internos',
        'Papelería',
        'Herramientas',
        'Combustible',
        'Alimentación',
        'Mensajería',
        'Mantenimiento',
      ],
    },
    {
      name: 'Producción',
      description: 'Gastos asociados directamente a generar ingresos (requiere OT)',
      subcategories: [
        'Compra de materiales para cliente',
        'Servicios subcontratados',
        'Costos directos de orden de trabajo',
      ],
    },
    {
      name: 'Administrativos',
      description: 'Gastos de gestión y soporte',
      subcategories: [
        'Contador',
        'Asesoría legal',
        'Software',
        'Bancos',
        'Comisiones',
        'Notaría',
      ],
    },
    {
      name: 'Personal',
      description: 'Gastos relacionados con empleados',
      subcategories: ['Anticipos', 'Viáticos', 'Reembolsos', 'Capacitación'],
    },
    {
      name: 'Servicios recurrentes',
      description: 'Pagos periódicos',
      subcategories: ['Arriendo', 'Internet', 'Luz / agua', 'Hosting', 'Licencias'],
    },
  ];

  for (const typeData of expenseTypesData) {
    const expenseType = await prisma.expenseType.upsert({
      where: { name: typeData.name },
      update: { description: typeData.description },
      create: { name: typeData.name, description: typeData.description },
    });
    console.log(`  ✓ ExpenseType: ${typeData.name}`);

    for (const subcatName of typeData.subcategories) {
      await prisma.expenseSubcategory.upsert({
        where: { name_expenseTypeId: { name: subcatName, expenseTypeId: expenseType.id } },
        update: {},
        create: { name: subcatName, expenseTypeId: expenseType.id },
      });
    }
  }

  console.log(`   - Consecutives: ${consecutivesData.length}`);
  console.log(`   - Production Areas: ${productionAreasData.length}`);
  console.log(`   - Commercial Channels: ${channelsCreated}`);
  console.log(`   - Editable Order Statuses: ${editableStatuses.length}`);
  console.log('\n🔐 Test Credentials (username / password):');
  console.log('   Admin:   adminsistema / admin123');
  console.log('   Manager: managersistema / manager123');
  console.log('   User:    usuariosistema / user123');
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
