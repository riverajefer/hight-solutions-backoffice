# Extensions Guide

This guide explains how to add new features while respecting the existing architecture.

## Adding a New Module

### Step 1: Create the Folder Structure

```bash
src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── <module-name>.repository.ts
└── dto/
    ├── <entity>.dto.ts
    └── index.ts
```

### Step 2: Define the Prisma Model

Add the model to `prisma/schema.prisma`:

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  price       Float
  categoryId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category Category @relation(fields: [categoryId], references: [id])
}
```

Run migration:

```bash
npx prisma migrate dev --name add_products
```

### Step 3: Create DTOs

```typescript
// dto/product.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Product Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'category-uuid' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;
}
```

### Step 4: Create Repository

```typescript
// products.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async findByName(name: string) {
    return this.prisma.product.findUnique({
      where: { name },
    });
  }

  async findByNameExcludingId(name: string, id: string) {
    return this.prisma.product.findFirst({
      where: { name, NOT: { id } },
    });
  }

  async create(data: CreateProductDto) {
    return this.prisma.product.create({
      data,
      include: { category: true },
    });
  }

  async update(id: string, data: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
```

### Step 5: Create Service

```typescript
// products.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    // Validate name uniqueness
    const existingName = await this.repository.findByName(dto.name);
    if (existingName) {
      throw new BadRequestException(`Product name "${dto.name}" already exists`);
    }

    // Validate category exists
    const category = await this.categoriesRepository.findById(dto.categoryId);
    if (!category) {
      throw new BadRequestException(`Category with id ${dto.categoryId} not found`);
    }

    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    // Validate name uniqueness if changing
    if (dto.name) {
      const existingName = await this.repository.findByNameExcludingId(dto.name, id);
      if (existingName) {
        throw new BadRequestException(`Product name "${dto.name}" already exists`);
      }
    }

    // Validate category if changing
    if (dto.categoryId) {
      const category = await this.categoriesRepository.findById(dto.categoryId);
      if (!category) {
        throw new BadRequestException(`Category with id ${dto.categoryId} not found`);
      }
    }

    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repository.delete(id);
    return { message: 'Product deleted successfully' };
  }
}
```

### Step 6: Create Controller

```typescript
// products.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '@common/guards';
import { RequirePermissions } from '@common/decorators';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequirePermissions('read_products')
  @ApiOperation({ summary: 'Get all products' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_products')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_products')
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('update_products')
  @ApiOperation({ summary: 'Update a product' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_products')
  @ApiOperation({ summary: 'Delete a product' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### Step 7: Create Module

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule], // Import if you need other repositories
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsRepository], // Export if other modules need it
})
export class ProductsModule {}
```

### Step 8: Register in AppModule

```typescript
// app.module.ts
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProductsModule, // Add here
  ],
})
export class AppModule {}
```

### Step 9: Add Permissions

Update the seed file or create via API:

```typescript
// New permissions for the module
const productPermissions = [
  { name: 'read_products', description: 'View products' },
  { name: 'create_products', description: 'Create products' },
  { name: 'update_products', description: 'Update products' },
  { name: 'delete_products', description: 'Delete products' },
];
```

## Adding a New Endpoint to Existing Module

### Example: Adding Bulk Delete to Users

```typescript
// users.controller.ts
@Delete('bulk')
@RequirePermissions('delete_users')
@ApiOperation({ summary: 'Delete multiple users' })
async bulkRemove(@Body() dto: BulkDeleteDto) {
  return this.service.bulkRemove(dto.ids);
}

// users.service.ts
async bulkRemove(ids: string[]) {
  const result = await this.repository.deleteMany(ids);
  return { message: `${result.count} users deleted successfully` };
}

// users.repository.ts
async deleteMany(ids: string[]) {
  return this.prisma.user.deleteMany({
    where: { id: { in: ids } },
  });
}

// dto/user.dto.ts
export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
```

## Adding a New Permission

### Step 1: Add to Seed (for initial setup)

```typescript
// prisma/seeds/seed.ts
const newPermissions = [
  { name: 'export_reports', description: 'Export system reports' },
];

for (const perm of newPermissions) {
  await prisma.permission.upsert({
    where: { name: perm.name },
    update: {},
    create: perm,
  });
}
```

### Step 2: Use in Controller

```typescript
@Get('export')
@RequirePermissions('export_reports')
async exportReport() { }
```

## Adding a Custom Decorator

### Example: Rate Limiting Decorator

```typescript
// common/decorators/rate-limit.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  ttl: number;      // Time window in seconds
  limit: number;    // Max requests in window
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Usage in controller
@RateLimit({ ttl: 60, limit: 10 })
@Post('login')
async login() { }
```

## Adding a Custom Guard

### Example: IP Whitelist Guard

```typescript
// common/guards/ip-whitelist.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;
    const whitelist = this.configService.get<string[]>('app.ipWhitelist');

    if (!whitelist || whitelist.length === 0) {
      return true; // No whitelist = allow all
    }

    if (!whitelist.includes(clientIp)) {
      throw new ForbiddenException('IP address not allowed');
    }

    return true;
  }
}
```

## Adding a New Configuration

### Step 1: Create Config File

```typescript
// config/storage.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'local',
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION,
}));
```

### Step 2: Register in ConfigModule

```typescript
// config/config.module.ts
import storageConfig from './storage.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [appConfig, databaseConfig, jwtConfig, storageConfig],
    }),
  ],
})
```

### Step 3: Use in Service

```typescript
@Injectable()
export class StorageService {
  constructor(private configService: ConfigService) {}

  getProvider() {
    return this.configService.get('storage.provider');
  }
}
```

## Adding Database Relations

### One-to-Many Example

```prisma
// Parent model
model Category {
  id       String    @id @default(uuid())
  name     String    @unique
  products Product[]
}

// Child model
model Product {
  id         String   @id @default(uuid())
  name       String
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
}
```

### Many-to-Many Example

```prisma
model Product {
  id   String       @id @default(uuid())
  name String
  tags ProductTag[]
}

model Tag {
  id       String       @id @default(uuid())
  name     String       @unique
  products ProductTag[]
}

model ProductTag {
  productId String
  tagId     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
}
```

## Checklist for New Features

Before submitting new code, verify:

- [ ] Module follows folder structure convention
- [ ] All classes use proper naming conventions
- [ ] DTOs have validation decorators
- [ ] DTOs have Swagger decorators
- [ ] Controller uses `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- [ ] All endpoints have `@RequirePermissions()` decorator
- [ ] Service validates data before database operations
- [ ] Repository handles all database queries
- [ ] New permissions are documented
- [ ] Module is registered in AppModule
- [ ] Prisma schema is updated (if needed)
- [ ] Migration is created (if schema changed)
- [ ] Index.ts files export new components

## Common Mistakes to Avoid

### 1. Accessing Prisma Directly in Service

```typescript
// WRONG
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany(); // Direct access
  }
}

// CORRECT
@Injectable()
export class ProductsService {
  constructor(private repository: ProductsRepository) {}

  findAll() {
    return this.repository.findAll(); // Via repository
  }
}
```

### 2. Missing Permission Checks

```typescript
// WRONG - No permission required
@Get()
async findAll() { }

// CORRECT
@Get()
@RequirePermissions('read_products')
async findAll() { }
```

### 3. Forgetting Guards on Controller

```typescript
// WRONG - Endpoints are public
@Controller('products')
export class ProductsController { }

// CORRECT
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController { }
```

### 4. Not Validating Foreign Keys

```typescript
// WRONG - categoryId might not exist
async create(dto: CreateProductDto) {
  return this.repository.create(dto);
}

// CORRECT
async create(dto: CreateProductDto) {
  const category = await this.categoriesRepository.findById(dto.categoryId);
  if (!category) {
    throw new BadRequestException('Category not found');
  }
  return this.repository.create(dto);
}
```
