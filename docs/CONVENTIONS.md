# Conventions

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Module | `<name>.module.ts` | `users.module.ts` |
| Controller | `<name>.controller.ts` | `users.controller.ts` |
| Service | `<name>.service.ts` | `users.service.ts` |
| Repository | `<name>.repository.ts` | `users.repository.ts` |
| DTO | `<name>.dto.ts` | `user.dto.ts` |
| Guard | `<name>.guard.ts` | `permissions.guard.ts` |
| Strategy | `<name>.strategy.ts` | `jwt.strategy.ts` |
| Decorator | `<name>.decorator.ts` | `current-user.decorator.ts` |
| Interface | `<name>.interface.ts` | `auth.interface.ts` |
| Config | `<name>.config.ts` | `jwt.config.ts` |

### Classes

| Type | Pattern | Example |
|------|---------|---------|
| Module | `<Name>Module` | `UsersModule` |
| Controller | `<Name>Controller` | `UsersController` |
| Service | `<Name>Service` | `UsersService` |
| Repository | `<Name>Repository` | `UsersRepository` |
| Guard | `<Name>Guard` | `PermissionsGuard` |
| Strategy | `<Name>Strategy` | `JwtStrategy` |
| DTO | `<Action><Entity>Dto` | `CreateUserDto`, `UpdateRoleDto` |

### Database

| Type | Pattern | Example |
|------|---------|---------|
| Table | PascalCase (singular) | `User`, `Role`, `Permission` |
| Column | camelCase | `createdAt`, `roleId`, `refreshToken` |
| Junction | `<Entity1><Entity2>` | `RolePermission` |

### Variables and Functions

```typescript
// Variables: camelCase
const userId = 'uuid';
const hasPermission = true;

// Functions: camelCase, verb prefix
function findAll() { }
function createUser() { }
function validateToken() { }

// Constants: UPPER_SNAKE_CASE
const JWT_SECRET = 'secret';
const SALT_ROUNDS = 12;
const PERMISSIONS_KEY = 'permissions';
```

### Decorators and Metadata Keys

```typescript
// Decorators: PascalCase, descriptive
@Public()
@CurrentUser()
@RequirePermissions('read_users')

// Metadata keys: UPPER_SNAKE_CASE
export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';
```

## Code Patterns

### Module Definition

```typescript
@Module({
  imports: [
    // External modules first
    ExternalModule,
    // Internal modules second
    InternalModule,
  ],
  controllers: [EntityController],
  providers: [EntityService, EntityRepository],
  exports: [EntityRepository], // Only export what others need
})
export class EntityModule {}
```

### Controller Definition

```typescript
@ApiTags('entity')
@Controller('entity')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EntityController {
  constructor(private readonly service: EntityService) {}

  @Get()
  @RequirePermissions('read_entity')
  @ApiOperation({ summary: 'Get all entities' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_entity')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_entity')
  async create(@Body() dto: CreateEntityDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('update_entity')
  async update(@Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_entity')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### Service Definition

```typescript
@Injectable()
export class EntityService {
  constructor(
    private readonly repository: EntityRepository,
    private readonly otherRepository: OtherRepository,
  ) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return entity;
  }

  async create(dto: CreateEntityDto) {
    // 1. Validate uniqueness
    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw new BadRequestException('Name already exists');
    }

    // 2. Validate relationships
    if (dto.relatedId) {
      const related = await this.otherRepository.findById(dto.relatedId);
      if (!related) {
        throw new BadRequestException('Related entity not found');
      }
    }

    // 3. Create entity
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateEntityDto) {
    // 1. Validate exists
    await this.findOne(id);

    // 2. Validate uniqueness if changing
    if (dto.name) {
      const existing = await this.repository.findByNameExcludingId(dto.name, id);
      if (existing) {
        throw new BadRequestException('Name already exists');
      }
    }

    // 3. Update
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repository.delete(id);
    return { message: 'Deleted successfully' };
  }
}
```

### Repository Definition

```typescript
@Injectable()
export class EntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.entity.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.entity.findUnique({
      where: { id },
      include: { relation: true },
    });
  }

  async findByName(name: string) {
    return this.prisma.entity.findUnique({
      where: { name },
    });
  }

  async findByNameExcludingId(name: string, id: string) {
    return this.prisma.entity.findFirst({
      where: { name, NOT: { id } },
    });
  }

  async create(data: CreateEntityDto) {
    return this.prisma.entity.create({ data });
  }

  async update(id: string, data: UpdateEntityDto) {
    return this.prisma.entity.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.entity.delete({
      where: { id },
    });
  }
}
```

### DTO Definition

```typescript
// Create DTO - all required fields
export class CreateEntityDto {
  @ApiProperty({ example: 'entity_name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  relatedId: string;
}

// Update DTO - all optional fields
export class UpdateEntityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
```

## API Conventions

### URL Structure

```
/api/v1/<resource>              # Collection
/api/v1/<resource>/:id          # Single item
/api/v1/<resource>/:id/<sub>    # Sub-resource
```

### HTTP Methods

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Retrieve | `GET /users`, `GET /users/:id` |
| POST | Create | `POST /users` |
| PUT | Replace/Full update | `PUT /users/:id` |
| PATCH | Partial update | `PATCH /users/:id` |
| DELETE | Remove | `DELETE /users/:id` |

### Response Formats

```typescript
// Success - Single item
{
  "id": "uuid",
  "name": "value",
  "createdAt": "2025-01-17T00:00:00.000Z"
}

// Success - List
[
  { "id": "uuid1", "name": "value1" },
  { "id": "uuid2", "name": "value2" }
]

// Success - Delete
{
  "message": "Deleted successfully"
}

// Error
{
  "message": "Error description",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, DELETE |
| 201 | Successful POST (created) |
| 400 | Validation error, bad request |
| 401 | Unauthorized (invalid token) |
| 403 | Forbidden (missing permissions) |
| 404 | Resource not found |
| 500 | Server error |

## Validation Rules

### Required Validators by Field Type

| Field Type | Validators |
|------------|-----------|
| Email | `@IsEmail()` |
| Password | `@IsString()`, `@MinLength(6)` |
| UUID | `@IsString()`, `@IsUUID()` (optional) |
| Name | `@IsString()`, `@IsNotEmpty()` |
| Optional text | `@IsString()`, `@IsOptional()` |
| Array | `@IsArray()`, `@ArrayMinSize(1)` (if required) |

### Update DTOs

All fields in Update DTOs should be optional:

```typescript
export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
```

## Security Conventions

### Password Handling

```typescript
// Hashing (always 12 rounds)
const hashed = await bcrypt.hash(password, 12);

// Comparison
const isValid = await bcrypt.compare(input, stored);
```

### Token Handling

```typescript
// Access token payload
{
  sub: userId,
  email: user.email,
  roleId: user.roleId,
  type: 'access'
}

// Refresh token payload
{
  sub: userId,
  email: user.email,
  roleId: user.roleId,
  type: 'refresh'
}
```

### Permission Names

Format: `<action>_<resource>`

```
read_users
create_users
update_users
delete_users
manage_permissions
```

## Import Conventions

### Order of Imports

```typescript
// 1. NestJS core
import { Injectable, NotFoundException } from '@nestjs/common';

// 2. Third-party libraries
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// 3. Internal modules (using aliases)
import { PrismaService } from '@/database';
import { RequirePermissions } from '@common/decorators';

// 4. Local imports (relative)
import { CreateUserDto } from './dto';
import { UsersRepository } from './users.repository';
```

### Export Patterns

Each folder with multiple exports should have an `index.ts`:

```typescript
// dto/index.ts
export * from './user.dto';

// decorators/index.ts
export * from './public.decorator';
export * from './current-user.decorator';
export * from './require-permissions.decorator';
```

## Error Handling

### Exception Usage

| Exception | When to Use |
|-----------|-------------|
| `BadRequestException` | Invalid input, duplicate data, business rule violation |
| `UnauthorizedException` | Invalid credentials, expired token |
| `ForbiddenException` | Missing permissions, access denied |
| `NotFoundException` | Resource not found |

### Error Messages

```typescript
// Specific and helpful
throw new NotFoundException(`User with id ${id} not found`);
throw new BadRequestException(`Email ${email} is already registered`);
throw new ForbiddenException(`Missing required permissions: ${missing.join(', ')}`);
```

## Testing Conventions

### File Naming

```
<name>.spec.ts      # Unit tests
<name>.e2e-spec.ts  # E2E tests
```

### Test Structure

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: MockType<UsersRepository>;

  beforeEach(async () => {
    // Setup
  });

  describe('findOne', () => {
    it('should return user when found', async () => { });
    it('should throw NotFoundException when not found', async () => { });
  });
});
```
