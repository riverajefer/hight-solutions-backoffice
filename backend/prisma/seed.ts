import { PrismaClient, OrderStatus } from '../src/generated/prisma';
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
    { name: 'read_clients', description: 'View clients' },
    { name: 'update_clients', description: 'Update client information' },
    { name: 'delete_clients', description: 'Delete clients' },

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

    // Service Categories
    {
      name: 'create_service_categories',
      description: 'Crear categorías de servicios',
    },
    {
      name: 'read_service_categories',
      description: 'Ver categorías de servicios',
    },
    {
      name: 'update_service_categories',
      description: 'Actualizar categorías de servicios',
    },
    {
      name: 'delete_service_categories',
      description: 'Eliminar categorías de servicios',
    },

    // Services
    { name: 'create_services', description: 'Crear servicios' },
    { name: 'read_services', description: 'Ver servicios' },
    { name: 'update_services', description: 'Actualizar servicios' },
    { name: 'delete_services', description: 'Eliminar servicios' },

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
      description: 'Aprobar/confirmar órdenes de pedido',
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
    'read_suppliers',
    'read_units_of_measure',
    'read_service_categories',
    'read_services',
    'read_supply_categories',
    'read_supplies',
    'create_orders',
    'read_orders',
    'update_orders',
    'approve_orders',
  ]);

  // User - solo lectura básica
  await assignPermissionsToRole(userRole.id, 'user', [
    'read_users',
    'read_roles',
    'read_orders',
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
      firstName: 'Admin',
      lastName: 'Sistema',
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'Sistema',
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
      firstName: 'Manager',
      lastName: 'Gerente',
    },
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      roleId: managerRole.id,
      firstName: 'Manager',
      lastName: 'Gerente',
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
      firstName: 'Usuario',
      lastName: 'Regular',
    },
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Usuario',
      lastName: 'Regular',
      roleId: userRole.id,
    },
  });
  console.log(`  ✓ Regular user: ${regularUser.email}`);

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
  // 7. Crear Categorías de Servicios
  // ============================================
  console.log('\n📦 Creating service categories...');

  const serviceCategoriesData = [
    {
      name: 'Impresión Gran Formato',
      slug: 'impresion-gran-formato',
      description:
        'Servicios de impresión en gran formato como pendones, banners y vallas',
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

  for (const categoryData of serviceCategoriesData) {
    await prisma.serviceCategory.upsert({
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
  // 8. Crear Servicios de Prueba
  // ============================================
  console.log('\n🛠️ Creating services...');

  // Obtener categorías para usar sus IDs
  const impresionCategory = await prisma.serviceCategory.findUnique({
    where: { slug: 'impresion-gran-formato' },
  });
  const promocionalesCategory = await prisma.serviceCategory.findUnique({
    where: { slug: 'promocionales' },
  });
  const papeleriaCategory = await prisma.serviceCategory.findUnique({
    where: { slug: 'papeleria' },
  });
  const senalizacionCategory = await prisma.serviceCategory.findUnique({
    where: { slug: 'senalizacion' },
  });

  const servicesData = [
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

  let servicesCreated = 0;
  for (const serviceData of servicesData) {
    if (serviceData.categoryId) {
      await prisma.service.upsert({
        where: { slug: serviceData.slug },
        update: {
          name: serviceData.name,
          description: serviceData.description,
          basePrice: serviceData.basePrice,
          priceUnit: serviceData.priceUnit,
        },
        create: {
          name: serviceData.name,
          slug: serviceData.slug,
          description: serviceData.description,
          basePrice: serviceData.basePrice,
          priceUnit: serviceData.priceUnit,
          categoryId: serviceData.categoryId,
        },
      });
      console.log(`  ✓ Service: ${serviceData.name}`);
      servicesCreated++;
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

  // Obtener algunos clientes y servicios para las órdenes
  const client1 = await prisma.client.findFirst({
    where: { email: 'contacto@distribuidoraelsol.com' },
  });
  const client2 = await prisma.client.findFirst({
    where: { email: 'ventas@publicidadcreativa.com' },
  });

  const tarjetasService = await prisma.service.findFirst({
    where: { slug: 'tarjetas-presentacion-x-1000' },
  });
  const bannerService = await prisma.service.findFirst({
    where: { slug: 'banner-1x2-metros' },
  });
  const sellosService = await prisma.service.findFirst({
    where: { slug: 'sellos-automaticos' },
  });

  const adminUserForOrders = await prisma.user.findFirst({
    where: { email: 'admin@example.com' },
  });

  // Orden 1: CONFIRMED con items y pago inicial
  if (client1 && tarjetasService && bannerService && adminUserForOrders) {
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'OP-2024-001' + randomUUID().slice(0, 5),
        orderDate: new Date('2024-01-15'),
        deliveryDate: new Date('2024-01-25'),
        status: 'CONFIRMED',
        notes: 'Cliente solicita colores corporativos: azul y blanco',
        subtotal: 450000,
        taxRate: 0.19,
        tax: 85500,
        total: 535500,
        paidAmount: 200000,
        balance: 335500,
        clientId: client1.id,
        createdById: adminUserForOrders.id,
        items: {
          create: [
            {
              description:
                'Tarjetas de presentación full color, papel propalcote 300gr',
              quantity: 1000,
              unitPrice: 250000,
              total: 250000,
              sortOrder: 1,
              serviceId: tarjetasService.id,
              specifications: {
                material: 'Propalcote 300gr',
                tamaño: '9x5 cm',
                acabado: 'Laminado mate',
                colores: 'Full color (4x4)',
              },
            },
            {
              description: 'Banner publicitario 1x2 metros',
              quantity: 10,
              unitPrice: 20000,
              total: 200000,
              sortOrder: 2,
              serviceId: bannerService.id,
              specifications: {
                material: 'Lona mate 13oz',
                tamaño: '1x2 metros',
                impresion: 'Full color',
              },
            },
          ],
        },
        payments: {
          create: {
            amount: 200000,
            paymentMethod: 'TRANSFER',
            paymentDate: new Date('2024-01-15'),
            reference: 'TRANSF-001-2024',
            notes: 'Abono inicial 40%',
            receivedById: adminUserForOrders.id,
          },
        },
      },
    });
    console.log(`  ✓ Order: ${order1.orderNumber} - ${order1.status}`);
  }

  // Orden 2: IN_PRODUCTION con items y múltiples pagos
  if (client2 && sellosService && tarjetasService && adminUserForOrders) {
    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'OP-2024-002',
        orderDate: new Date('2024-01-18'),
        deliveryDate: new Date('2024-01-28'),
        status: 'IN_PRODUCTION',
        notes: 'Entrega urgente. Cliente requiere factura electrónica',
        subtotal: 850000,
        taxRate: 0.19,
        tax: 161500,
        total: 1011500,
        paidAmount: 800000,
        balance: 211500,
        clientId: client2.id,
        createdById: adminUserForOrders.id,
        items: {
          create: [
            {
              description: 'Sellos automáticos empresariales con logo',
              quantity: 5,
              unitPrice: 80000,
              total: 400000,
              sortOrder: 1,
              serviceId: sellosService.id,
              specifications: {
                tipo: 'Automático Trodat 4913',
                tamaño: '58x22 mm',
                tinta: 'Negro',
                incluye: 'Logo + texto personalizado',
              },
            },
            {
              description: 'Tarjetas de presentación premium doble cara',
              quantity: 1500,
              unitPrice: 300,
              total: 450000,
              sortOrder: 2,
              serviceId: tarjetasService.id,
              specifications: {
                material: 'Cartulina Bristol 240gr',
                tamaño: '9x5 cm',
                acabado: 'Laminado UV brillante',
                colores: 'Full color doble cara (4x4)',
                extras: 'Stamping dorado',
              },
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 500000,
              paymentMethod: 'TRANSFER',
              paymentDate: new Date('2024-01-18'),
              reference: 'TRANSF-002-2024',
              notes: 'Abono inicial 50%',
              receivedById: adminUserForOrders.id,
            },
            {
              amount: 300000,
              paymentMethod: 'CARD',
              paymentDate: new Date('2024-01-22'),
              reference: 'CARD-003-2024',
              notes: 'Segundo abono',
              receivedById: adminUserForOrders.id,
            },
          ],
        },
      },
    });
    console.log(`  ✓ Order: ${order2.orderNumber} - ${order2.status}`);
  }

  // ============================================
  // 13. Crear Consecutivos Iniciales
  // ============================================
  console.log('\n🔢 Creating initial consecutives...');

  const consecutivesData = [
    {
      type: 'ORDER',
      prefix: 'OP',
      year: new Date().getFullYear(),
      lastNumber: 0,
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
  ];

  for (const consecutive of consecutivesData) {
    await prisma.consecutive.upsert({
      where: { type: consecutive.type },
      update: {},
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
        update: {
          description: channelData.description,
        },
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
        allowEditRequests: false,
        description: 'Entregada - no se puede editar',
      },
      {
        orderStatus: OrderStatus.CANCELLED,
        allowEditRequests: false,
        description: 'Cancelada - no se puede editar',
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
    console.log(`   - Cargos: ${cargosData.length}`);
    console.log(`   - Departments: ${departmentsData.length}`);
    console.log(`   - Cities: ${totalCities}`);
    console.log(`   - Clients: ${clientsCreated}`);
    console.log(`   - Suppliers: ${suppliersCreated}`);
    console.log(`   - Units of Measure: ${unitsOfMeasureData.length}`);
    console.log(`   - Service Categories: ${serviceCategoriesData.length}`);
    console.log(`   - Services: ${servicesCreated}`);
    console.log(`   - Supply Categories: ${supplyCategoriesData.length}`);
    console.log(`   - Supplies: ${suppliesCreated}`);
    console.log(`   - Orders: 2`);
    console.log(`   - Consecutives: ${consecutivesData.length}`);
    console.log(`   - Production Areas: ${productionAreasData.length}`);
    console.log(`   - Commercial Channels: ${channelsCreated}`);
    console.log(`   - Editable Order Statuses: ${editableStatuses.length}`);
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin:   admin@example.com / admin123');
    console.log('   Manager: manager@example.com / manager123');
    console.log('   User:    user@example.com / user123');
    console.log('='.repeat(50) + '\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
