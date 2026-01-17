# Guía de DTOs y Validación

Esta guía explica cómo crear y usar Data Transfer Objects (DTOs) con validación en el proyecto.

## ¿Qué es un DTO?

Un DTO (Data Transfer Object) es una clase que define la estructura de los datos que se envían/reciben en los endpoints. En NestJS usamos `class-validator` para validar automáticamente estos datos.

## Instalación de Dependencias

Ya están instaladas en el proyecto:

```bash
npm install class-validator class-transformer
```

## Configuración Global

En `src/main.ts` ya está configurado:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Remueve propiedades no definidas en el DTO
    forbidNonWhitelisted: true,   // Lanza error si hay propiedades extra
    transform: true,               // Transforma tipos automáticamente
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

## Estructura de DTOs

```
src/modules/[feature]/dto/
├── create-[feature].dto.ts
├── update-[feature].dto.ts
├── filter-[feature].dto.ts    (opcional)
└── index.ts
```

## DTOs Básicos

### Create DTO

```typescript
// src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
```

### Update DTO

```typescript
// src/modules/products/dto/update-product.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
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

**Alternativa con PartialType** (recomendado):

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Index File

```typescript
// src/modules/products/dto/index.ts
export * from './create-product.dto';
export * from './update-product.dto';
```

## Decoradores Comunes

### String Validators

```typescript
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsUrl,
  IsUUID,
} from 'class-validator';

@IsString()
name: string;

@IsNotEmpty()
requiredField: string;

@IsEmail()
email: string;

@MinLength(8)
password: string;

@MaxLength(100)
title: string;

@Matches(/^[A-Z0-9-]+$/)
code: string;

@IsUrl()
website: string;

@IsUUID()
id: string;
```

### Number Validators

```typescript
import {
  IsNumber,
  IsInt,
  IsPositive,
  IsNegative,
  Min,
  Max,
  IsDivisibleBy,
} from 'class-validator';

@IsNumber()
price: number;

@IsInt()
quantity: number;

@IsPositive()
positiveNumber: number;

@IsNegative()
negativeNumber: number;

@Min(0)
minValue: number;

@Max(100)
maxValue: number;

@IsDivisibleBy(5)
divisible: number;
```

### Boolean Validators

```typescript
import { IsBoolean } from 'class-validator';

@IsBoolean()
isActive: boolean;
```

### Date Validators

```typescript
import { IsDate, MinDate, MaxDate } from 'class-validator';
import { Type } from 'class-transformer';

@IsDate()
@Type(() => Date)
birthDate: Date;

@MinDate(new Date())
@Type(() => Date)
futureDate: Date;
```

### Array Validators

```typescript
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';

@IsArray()
@ArrayNotEmpty()
items: string[];

@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
tags: string[];

@IsArray()
@ArrayUnique()
uniqueIds: string[];
```

### Enum Validators

```typescript
import { IsEnum } from 'class-validator';

enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

@IsEnum(Status)
status: Status;
```

### Object Validators

```typescript
import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;
}

class UserDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
```

### Optional vs Required

```typescript
import { IsOptional } from 'class-validator';

// Requerido
@IsString()
requiredField: string;

// Opcional
@IsString()
@IsOptional()
optionalField?: string;
```

## DTOs Avanzados

### DTO con Validación Personalizada

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';

@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
class IsAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDate: Date, args: ValidationArguments) {
    const object = args.object as any;
    return endDate > object.startDate;
  }

  defaultMessage(args: ValidationArguments) {
    return 'End date must be after start date';
  }
}

export class CreateEventDto {
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @Validate(IsAfterStartDateConstraint)
  endDate: Date;
}
```

### DTO con Transformación

```typescript
import { Transform } from 'class-transformer';
import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @Transform(({ value }) => value.trim())
  name: string;
}
```

### DTO de Paginación

```typescript
// src/common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

**Uso**:

```typescript
@Get()
findAll(@Query() pagination: PaginationDto) {
  return this.service.findAll({
    skip: pagination.skip,
    take: pagination.limit,
  });
}
```

### DTO de Filtros

```typescript
// src/modules/products/dto/filter-product.dto.ts
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(999999)
  maxPrice?: number;
}
```

**Uso en Service**:

```typescript
async findAll(filters: FilterProductDto) {
  const where: any = {};

  if (filters.search) {
    where.name = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) {
      where.price.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.price.lte = filters.maxPrice;
    }
  }

  return this.prisma.product.findMany({
    where,
    skip: filters.skip,
    take: filters.limit,
    orderBy: { createdAt: 'desc' },
  });
}
```

### DTO con Múltiples Validaciones Condicionales

```typescript
import { IsString, IsEnum, ValidateIf } from 'class-validator';

enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
}

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // Solo requerido si el método es CARD
  @ValidateIf(o => o.method === PaymentMethod.CARD)
  @IsString()
  cardNumber?: string;

  // Solo requerido si el método es TRANSFER
  @ValidateIf(o => o.method === PaymentMethod.TRANSFER)
  @IsString()
  accountNumber?: string;
}
```

## Mensajes de Error Personalizados

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  name: string;

  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;
}
```

## Grupos de Validación

```typescript
import { IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString({ groups: ['update'] })
  name?: string;

  @MinLength(8, { groups: ['password-change'] })
  password?: string;
}
```

**Uso**:

```typescript
@Put(':id')
update(
  @Param('id') id: string,
  @Body(new ValidationPipe({ groups: ['update'] }))
  dto: UpdateUserDto,
) {
  return this.service.update(id, dto);
}

@Put(':id/password')
changePassword(
  @Param('id') id: string,
  @Body(new ValidationPipe({ groups: ['password-change'] }))
  dto: UpdateUserDto,
) {
  return this.service.changePassword(id, dto.password);
}
```

## Validación Manual

```typescript
import { validate } from 'class-validator';

async validateDto(dto: CreateProductDto) {
  const errors = await validate(dto);
  
  if (errors.length > 0) {
    const messages = errors.map(error => 
      Object.values(error.constraints || {})
    ).flat();
    
    throw new BadRequestException(messages);
  }
}
```

## Testing DTOs

```typescript
// create-product.dto.spec.ts
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = new CreateProductDto();
    dto.name = 'Test Product';
    dto.price = 99.99;
    dto.stock = 10;
    dto.categoryId = 'cat-123';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid price', async () => {
    const dto = new CreateProductDto();
    dto.name = 'Test Product';
    dto.price = -10; // Invalid
    dto.stock = 10;
    dto.categoryId = 'cat-123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('price');
  });
});
```

## Best Practices

1. **Separar DTOs**: Un DTO por operación (create, update, filter)
2. **Reusar con PartialType**: Para update DTOs, usa `PartialType(CreateDto)`
3. **Validar Todo**: Nunca confíes en datos del cliente sin validar
4. **Mensajes Claros**: Provee mensajes de error descriptivos
5. **Transformaciones**: Usa `@Transform()` para normalizar datos (trim, lowercase, etc.)
6. **Tipos Correctos**: Usa `@Type()` para conversiones automáticas
7. **Documentar**: Agrega comentarios a DTOs complejos
8. **Index Exports**: Siempre exporta DTOs desde `index.ts`

## Checklist de Validación

- [ ] Todos los endpoints POST/PUT/PATCH usan DTOs
- [ ] Todos los campos tienen validadores apropiados
- [ ] Campos opcionales están marcados con `@IsOptional()`
- [ ] Arrays validados con decoradores de array
- [ ] Enums validados con `@IsEnum()`
- [ ] Objetos anidados usan `@ValidateNested()` y `@Type()`
- [ ] Fechas usan `@Type(() => Date)`
- [ ] DTOs de update extienden de CreateDTO con `PartialType`
- [ ] Mensajes de error son claros y útiles
- [ ] DTOs están exportados desde index.ts

## Ejemplo Completo de Módulo con DTOs

```typescript
// dto/create-order.dto.ts
import { IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

// dto/update-order.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional } from 'class-validator';

enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}

// dto/filter-order.dto.ts
import { IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterOrderDto extends PaginationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;
}

// dto/index.ts
export * from './create-order.dto';
export * from './update-order.dto';
export * from './filter-order.dto';
```
