# Template: CRUD Module

Este documento sirve como plantilla para crear nuevos módulos CRUD en el proyecto.

## Paso 1: Definir el Schema de Prisma

Primero, define el modelo en `prisma/schema.prisma`:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  categoryId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category @relation(fields: [categoryId], references: [id])

  @@map("products")
}
```

**Ejecutar migración:**

```bash
npx prisma migrate dev --name add_product_model
npx prisma generate
```

## Paso 2: Crear Estructura de Carpetas

```
src/modules/products/
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   └── index.ts
├── products.controller.ts
├── products.service.ts
└── products.module.ts
```

## Paso 3: DTOs

### create-product.dto.ts

```typescript
import { IsString, IsOptional, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  categoryId: string;
}
```

### update-product.dto.ts

```typescript
import { IsString, IsOptional, IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
```

### index.ts

```typescript
export * from './create-product.dto';
export * from './update-product.dto';
```

## Paso 4: Service

### products.service.ts

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear un nuevo producto
   */
  async create(dto: CreateProductDto) {
    // Validar que la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    return this.prisma.product.create({
      data: dto,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Obtener todos los productos con paginación opcional
   */
  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un producto por ID
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Actualizar un producto
   */
  async update(id: string, dto: UpdateProductDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se está actualizando la categoría, validar que existe
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Eliminar un producto
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
```

## Paso 5: Controller

### products.controller.ts

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('create_products')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @RequirePermissions('read_products')
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_products')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('update_products')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_products')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
```

## Paso 6: Module

### products.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Exportar si otros módulos lo necesitan
})
export class ProductsModule {}
```

## Paso 7: Registrar en App Module

En `src/app.module.ts`:

```typescript
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // ... otros módulos
    ProductsModule,
  ],
})
export class AppModule {}
```

## Paso 8: Crear Permisos en la Base de Datos

Agregar al seed o crear manualmente:

```typescript
// En prisma/seed.ts o ejecutar directamente
await prisma.permission.createMany({
  data: [
    {
      name: 'create_products',
      description: 'Create products',
    },
    {
      name: 'read_products',
      description: 'Read products',
    },
    {
      name: 'update_products',
      description: 'Update products',
    },
    {
      name: 'delete_products',
      description: 'Delete products',
    },
  ],
});
```

## Paso 9: Asignar Permisos a Roles

```typescript
// Asignar permisos al rol 'admin' por ejemplo
const adminRole = await prisma.role.findUnique({
  where: { name: 'admin' },
});

const productPermissions = await prisma.permission.findMany({
  where: {
    name: {
      in: ['create_products', 'read_products', 'update_products', 'delete_products'],
    },
  },
});

await prisma.rolePermission.createMany({
  data: productPermissions.map((permission) => ({
    roleId: adminRole.id,
    permissionId: permission.id,
  })),
});
```

## Endpoints Resultantes

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| POST | `/api/v1/products` | `create_products` | Crear producto |
| GET | `/api/v1/products` | `read_products` | Listar productos |
| GET | `/api/v1/products/:id` | `read_products` | Ver producto |
| PUT | `/api/v1/products/:id` | `update_products` | Actualizar producto |
| DELETE | `/api/v1/products/:id` | `delete_products` | Eliminar producto |

## Testing

Probar con herramientas como Postman o cURL:

```bash
# Login para obtener token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Crear producto
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Laptop",
    "description": "Gaming laptop",
    "price": 1299.99,
    "stock": 10,
    "categoryId": "category-uuid"
  }'

# Listar productos
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Checklist de Implementación

- [ ] Schema de Prisma definido
- [ ] Migración ejecutada
- [ ] DTOs creados y validados
- [ ] Service implementado con métodos CRUD
- [ ] Controller con Guards y decoradores
- [ ] Module creado y exportado
- [ ] Registrado en AppModule
- [ ] Permisos creados en DB
- [ ] Permisos asignados a roles
- [ ] Endpoints probados

## Notas Adicionales

- **Relaciones**: Si tu modelo tiene relaciones, recuerda incluirlas en las queries con `include`
- **Soft Delete**: Si necesitas soft delete, agrega campo `deletedAt` y modifica las queries
- **Paginación**: Implementa paginación usando `skip` y `take` de Prisma
- **Filtros**: Agrega DTOs para filtros de búsqueda si es necesario
- **Ordenamiento**: Usa `orderBy` en las queries para controlar el orden
