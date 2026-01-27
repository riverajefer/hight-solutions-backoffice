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
    { name: 'read_session_logs', description: 'Ver registros de inicio y cierre de sesión de usuarios' },

    // Units of Measure
    { name: 'create_units_of_measure', description: 'Crear unidades de medida' },
    { name: 'read_units_of_measure', description: 'Ver unidades de medida' },
    { name: 'update_units_of_measure', description: 'Actualizar unidades de medida' },
    { name: 'delete_units_of_measure', description: 'Eliminar unidades de medida' },

    // Service Categories
    { name: 'create_service_categories', description: 'Crear categorías de servicios' },
    { name: 'read_service_categories', description: 'Ver categorías de servicios' },
    { name: 'update_service_categories', description: 'Actualizar categorías de servicios' },
    { name: 'delete_service_categories', description: 'Eliminar categorías de servicios' },

    // Services
    { name: 'create_services', description: 'Crear servicios' },
    { name: 'read_services', description: 'Ver servicios' },
    { name: 'update_services', description: 'Actualizar servicios' },
    { name: 'delete_services', description: 'Eliminar servicios' },
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
  // 7. Crear Departamentos y Ciudades de Colombia
  // ============================================
  console.log('\n🇨🇴 Creating Colombian departments and cities...');

  const departmentsData = [
    { name: 'Amazonas', code: 'AMA', cities: ['Leticia', 'Puerto Nariño'] },
    { name: 'Antioquia', code: 'ANT', cities: ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Rionegro', 'Sabaneta', 'La Estrella', 'Apartadó'] },
    { name: 'Arauca', code: 'ARA', cities: ['Arauca', 'Tame', 'Saravena', 'Fortul'] },
    { name: 'Atlántico', code: 'ATL', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'] },
    { name: 'Bolívar', code: 'BOL', cities: ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar', 'Arjona'] },
    { name: 'Boyacá', code: 'BOY', cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'] },
    { name: 'Caldas', code: 'CAL', cities: ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Anserma'] },
    { name: 'Caquetá', code: 'CAQ', cities: ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'El Doncello'] },
    { name: 'Casanare', code: 'CAS', cities: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo'] },
    { name: 'Cauca', code: 'CAU', cities: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Piendamó'] },
    { name: 'Cesar', code: 'CES', cities: ['Valledupar', 'Aguachica', 'Codazzi', 'Bosconia', 'La Jagua de Ibirico'] },
    { name: 'Chocó', code: 'CHO', cities: ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Riosucio'] },
    { name: 'Córdoba', code: 'COR', cities: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Planeta Rica'] },
    { name: 'Cundinamarca', code: 'CUN', cities: ['Bogotá', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Girardot', 'Fusagasugá', 'Madrid'] },
    { name: 'Guainía', code: 'GUA', cities: ['Inírida'] },
    { name: 'Guaviare', code: 'GUV', cities: ['San José del Guaviare', 'El Retorno', 'Calamar'] },
    { name: 'Huila', code: 'HUI', cities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre'] },
    { name: 'La Guajira', code: 'LAG', cities: ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar'] },
    { name: 'Magdalena', code: 'MAG', cities: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato'] },
    { name: 'Meta', code: 'MET', cities: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'San Martín'] },
    { name: 'Nariño', code: 'NAR', cities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión'] },
    { name: 'Norte de Santander', code: 'NSA', cities: ['Cúcuta', 'Ocaña', 'Pamplona', 'Los Patios', 'Villa del Rosario'] },
    { name: 'Putumayo', code: 'PUT', cities: ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'Villagarzón'] },
    { name: 'Quindío', code: 'QUI', cities: ['Armenia', 'Calarcá', 'Montenegro', 'La Tebaida', 'Circasia'] },
    { name: 'Risaralda', code: 'RIS', cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'] },
    { name: 'San Andrés y Providencia', code: 'SAP', cities: ['San Andrés', 'Providencia'] },
    { name: 'Santander', code: 'SAN', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'] },
    { name: 'Sucre', code: 'SUC', cities: ['Sincelejo', 'Corozal', 'San Marcos', 'Sampués', 'Tolú'] },
    { name: 'Tolima', code: 'TOL', cities: ['Ibagué', 'Espinal', 'Melgar', 'Mariquita', 'Honda', 'Chaparral'] },
    { name: 'Valle del Cauca', code: 'VAC', cities: ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Buga', 'Cartago', 'Yumbo', 'Jamundí'] },
    { name: 'Vaupés', code: 'VAU', cities: ['Mitú', 'Carurú', 'Taraira'] },
    { name: 'Vichada', code: 'VIC', cities: ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo'] },
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
      description: 'Servicios de impresión en gran formato como pendones, banners y vallas',
      icon: '🖨️',
      sortOrder: 1,
    },
    {
      name: 'Promocionales',
      slug: 'promocionales',
      description: 'Artículos promocionales personalizados: gorras, lapiceros, vasos, etc.',
      icon: '🎁',
      sortOrder: 2,
    },
    {
      name: 'Papelería',
      slug: 'papeleria',
      description: 'Productos de papelería corporativa: tarjetas, cuadernos, volantes',
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
      description: 'Impresión de pendón en lona mate de alta calidad con estructura metálica',
      basePrice: 45000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Pendón 100x200 cm',
      slug: 'pendon-100x200-cm',
      description: 'Impresión de pendón en lona mate de alta calidad con estructura metálica',
      basePrice: 55000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Banner 1x2 metros',
      slug: 'banner-1x2-metros',
      description: 'Banner impreso en lona brillante con ojales para instalación',
      basePrice: 35000,
      priceUnit: 'por unidad',
      categoryId: impresionCategory?.id,
    },
    {
      name: 'Valla Publicitaria 3x2 metros',
      slug: 'valla-publicitaria-3x2-metros',
      description: 'Impresión de valla publicitaria en lona reforzada con bastidores',
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
  console.log(`   - Units of Measure: ${unitsOfMeasureData.length}`);
  console.log(`   - Service Categories: ${serviceCategoriesData.length}`);
  console.log(`   - Services: ${servicesCreated}`);
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
