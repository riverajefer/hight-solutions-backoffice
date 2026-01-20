# Guía de Relaciones en Prisma

Esta guía explica cómo manejar diferentes tipos de relaciones en el proyecto.

## Tipos de Relaciones

### 1. One-to-Many (1:N)

**Ejemplo: Category → Products**

```prisma
model Category {
  id        String    @id @default(uuid())
  name      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products Product[] // Una categoría tiene muchos productos

  @@map("categories")
}

model Product {
  id          String   @id @default(uuid())
  name        String
  categoryId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category @relation(fields: [categoryId], references: [id])

  @@map("products")
}
```

**Queries comunes:**

```typescript
// Obtener categoría con sus productos
const category = await prisma.category.findUnique({
  where: { id: categoryId },
  include: {
    products: true,
  },
});

// Obtener producto con su categoría
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    category: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});

// Crear producto con categoría
const product = await prisma.product.create({
  data: {
    name: 'New Product',
    categoryId: 'category-uuid',
  },
  include: {
    category: true,
  },
});
```

### 2. Many-to-Many (N:M)

**Ejemplo: Roles ↔ Permissions**

```prisma
model Role {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  permissions RolePermission[]

  @@map("roles")
}

model Permission {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roles RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  assignedAt   DateTime @default(now())

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

**Queries comunes:**

```typescript
// Obtener rol con sus permisos
const role = await prisma.role.findUnique({
  where: { id: roleId },
  include: {
    permissions: {
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    },
  },
});

// Transformar para mejor legibilidad
const roleWithPermissions = {
  ...role,
  permissions: role.permissions.map((rp) => rp.permission),
};

// Asignar permisos a un rol
await prisma.rolePermission.createMany({
  data: permissionIds.map((permissionId) => ({
    roleId: roleId,
    permissionId: permissionId,
  })),
  skipDuplicates: true,
});

// Remover permisos de un rol
await prisma.rolePermission.deleteMany({
  where: {
    roleId: roleId,
    permissionId: {
      in: permissionIds,
    },
  },
});

// Reemplazar todos los permisos de un rol
await prisma.$transaction([
  // Eliminar todos los permisos actuales
  prisma.rolePermission.deleteMany({
    where: { roleId: roleId },
  }),
  // Crear los nuevos
  prisma.rolePermission.createMany({
    data: newPermissionIds.map((permissionId) => ({
      roleId: roleId,
      permissionId: permissionId,
    })),
  }),
]);
```

### 3. One-to-One (1:1)

**Ejemplo: User → UserProfile**

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile UserProfile? // Relación opcional

  @@map("users")
}

model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  firstName String
  lastName  String
  phone     String?
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}
```

**Queries comunes:**

```typescript
// Obtener usuario con perfil
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
  },
});

// Crear usuario con perfil
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: hashedPassword,
    profile: {
      create: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '123456789',
      },
    },
  },
  include: {
    profile: true,
  },
});

// Actualizar perfil de usuario
const profile = await prisma.userProfile.update({
  where: { userId: userId },
  data: {
    firstName: 'Jane',
    phone: '987654321',
  },
});
```

## Patrones Comunes

### Cascade Delete

```prisma
model Category {
  id       String    @id @default(uuid())
  name     String
  products Product[]

  @@map("categories")
}

model Product {
  id         String   @id @default(uuid())
  name       String
  categoryId String

  // onDelete: Cascade significa que al eliminar la categoría,
  // se eliminan todos sus productos
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@map("products")
}
```

**Opciones de onDelete:**
- `Cascade`: Elimina registros relacionados
- `SetNull`: Establece el campo en NULL (requiere campo opcional)
- `Restrict`: Previene eliminación si hay relaciones
- `NoAction`: Deja la acción a la base de datos

### Relaciones Opcionales vs Requeridas

```prisma
model Order {
  id         String   @id @default(uuid())
  customerId String   // Requerido
  couponId   String?  // Opcional (note el '?')

  customer Customer  @relation(fields: [customerId], references: [id])
  coupon   Coupon?   @relation(fields: [couponId], references: [id])

  @@map("orders")
}
```

### Self-Relations (Auto-relaciones)

**Ejemplo: Employee → Manager (mismo modelo)**

```prisma
model Employee {
  id         String      @id @default(uuid())
  name       String
  managerId  String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  // Un empleado tiene un manager
  manager    Employee?   @relation("EmployeeToManager", fields: [managerId], references: [id])
  
  // Un empleado puede ser manager de muchos
  subordinates Employee[] @relation("EmployeeToManager")

  @@map("employees")
}
```

**Queries:**

```typescript
// Obtener empleado con su manager y subordinados
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    manager: true,
    subordinates: true,
  },
});
```

## Service Patterns para Relaciones

### Pattern: Create con relaciones

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    // Validar que el cliente existe
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // Crear orden con items relacionados
    return this.prisma.order.create({
      data: {
        customerId: dto.customerId,
        status: 'PENDING',
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
```

### Pattern: Update con relaciones

```typescript
async addPermissionsToRole(roleId: string, permissionIds: string[]) {
  // Validar que el rol existe
  const role = await this.prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new NotFoundException('Role not found');
  }

  // Validar que todos los permisos existen
  const permissions = await this.prisma.permission.findMany({
    where: {
      id: {
        in: permissionIds,
      },
    },
  });

  if (permissions.length !== permissionIds.length) {
    throw new BadRequestException('One or more permissions not found');
  }

  // Agregar permisos (skipDuplicates evita errores si ya existen)
  await this.prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: roleId,
      permissionId: permissionId,
    })),
    skipDuplicates: true,
  });

  // Retornar rol con permisos actualizados
  return this.findOne(roleId);
}
```

### Pattern: Delete con validación de relaciones

```typescript
async remove(categoryId: string) {
  // Verificar que existe
  const category = await this.prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new NotFoundException('Category not found');
  }

  // Prevenir eliminación si tiene productos
  if (category._count.products > 0) {
    throw new BadRequestException(
      `Cannot delete category with ${category._count.products} products`,
    );
  }

  await this.prisma.category.delete({
    where: { id: categoryId },
  });

  return { message: 'Category deleted successfully' };
}
```

## Transacciones para Operaciones Complejas

```typescript
async transferProductsBetweenCategories(
  fromCategoryId: string,
  toCategoryId: string,
  productIds: string[],
) {
  return this.prisma.$transaction(async (prisma) => {
    // Validar que ambas categorías existen
    const [fromCategory, toCategory] = await Promise.all([
      prisma.category.findUnique({ where: { id: fromCategoryId } }),
      prisma.category.findUnique({ where: { id: toCategoryId } }),
    ]);

    if (!fromCategory || !toCategory) {
      throw new NotFoundException('One or both categories not found');
    }

    // Mover productos
    await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        categoryId: fromCategoryId,
      },
      data: {
        categoryId: toCategoryId,
      },
    });

    // Retornar categorías actualizadas
    return {
      from: await prisma.category.findUnique({
        where: { id: fromCategoryId },
        include: { _count: { select: { products: true } } },
      }),
      to: await prisma.category.findUnique({
        where: { id: toCategoryId },
        include: { _count: { select: { products: true } } },
      }),
    };
  });
}
```

## Performance Tips

### 1. Usar `select` en lugar de `include` cuando sea posible

```typescript
// ❌ Trae todo el objeto relacionado
include: {
  category: true,
}

// ✅ Solo trae los campos necesarios
include: {
  category: {
    select: {
      id: true,
      name: true,
    },
  },
}
```

### 2. Usar `_count` para contar relaciones

```typescript
const categories = await prisma.category.findMany({
  include: {
    _count: {
      select: {
        products: true,
      },
    },
  },
});
```

### 3. Cargar relaciones solo cuando sea necesario

```typescript
// En el controller, usa DTOs para controlar qué se incluye
@Get(':id')
async findOne(
  @Param('id') id: string,
  @Query('include') include?: string,
) {
  const includeRelations = include?.split(',') || [];
  
  return this.service.findOne(id, {
    includeCategory: includeRelations.includes('category'),
    includeReviews: includeRelations.includes('reviews'),
  });
}
```

## Checklist de Relaciones

- [ ] Definir relación en ambos modelos del schema
- [ ] Agregar índices a claves foráneas si es necesario
- [ ] Configurar onDelete apropiado
- [ ] Validar relaciones en el service antes de crear/actualizar
- [ ] Usar transacciones para operaciones multi-paso
- [ ] Optimizar queries con select/include inteligente
- [ ] Documentar relaciones complejas
- [ ] Probar casos edge (eliminaciones, actualizaciones, etc.)
