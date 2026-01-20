# Architecture

## Design Pattern: Layered Architecture with Repository Pattern

This project implements a **layered architecture** combined with the **repository pattern**, ensuring clear separation of concerns and testability.

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Layer                           │
│   Controllers (handle HTTP requests/responses)          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Business Layer                         │
│   Services (business logic, validation, orchestration)  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   Data Access Layer                     │
│   Repositories (database queries, data mapping)         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                      ORM Layer                          │
│   PrismaService (database connection, client)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     Database                            │
│   SQLite (with better-sqlite3 adapter)                  │
└─────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Controllers
- Handle HTTP requests and responses
- Apply guards (authentication, authorization)
- Apply validation pipes
- Delegate business logic to services
- **Never contain business logic**

### Services
- Implement business rules
- Validate data constraints (uniqueness, relationships)
- Orchestrate operations across repositories
- Transform data as needed
- **Never access database directly**

### Repositories
- Execute database queries via Prisma
- Map database results to domain objects
- Handle complex queries with relations
- **Never contain business logic**

### PrismaService
- Manage database connection lifecycle
- Provide Prisma client to repositories
- Handle connection/disconnection hooks

## Key Design Patterns

### 1. Repository Pattern

Each entity has a dedicated repository that encapsulates all database operations:

```typescript
// Repository handles data access
@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// Service uses repository, not Prisma directly
@Injectable()
export class UsersService {
  constructor(private repository: UsersRepository) {}

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException();
    return user;
  }
}
```

### 2. Dependency Injection

NestJS IoC container manages all dependencies through constructor injection:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
}
```

### 3. Guard Chain Pattern

Authentication and authorization are handled by sequential guards:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)  // Order matters!
@RequirePermissions('create_users')
@Post()
async create(@Body() dto: CreateUserDto) { ... }
```

**Execution Order:**
1. `JwtAuthGuard` - Validates JWT token
2. `PermissionsGuard` - Checks user permissions

### 4. Decorator Metadata Pattern

Custom decorators store metadata that guards can read:

```typescript
// Decorator stores metadata
@SetMetadata('permissions', ['read_users', 'create_users'])
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Guard reads metadata
const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
  PERMISSIONS_KEY,
  [context.getHandler(), context.getClass()],
);
```

### 5. Strategy Pattern (Passport)

Authentication strategies are pluggable:

```typescript
// LocalStrategy - username/password authentication
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  async validate(email: string, password: string) {
    return this.authService.validateUser(email, password);
  }
}

// JwtStrategy - token authentication
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload) {
    return this.authService.validate(payload);
  }
}
```

### 6. Factory Configuration Pattern

Configuration is organized in typed factory functions:

```typescript
// jwt.config.ts
export default registerAs('jwt', () => ({
  secret: process.env.JWT_ACCESS_SECRET,
  expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
}));

// Usage
const jwtConfig = this.configService.get<JwtConfig>('jwt');
```

## Module Architecture

### Module Dependency Graph

```
AppModule
    │
    ├── ConfigModule (configuration)
    │
    ├── DatabaseModule (@Global)
    │       └── PrismaService
    │
    ├── AuthModule
    │       ├── JwtModule
    │       ├── PassportModule
    │       ├── AuthService
    │       ├── LocalStrategy
    │       └── JwtStrategy
    │
    ├── UsersModule
    │       ├── imports: RolesModule
    │       ├── UsersService
    │       └── UsersRepository
    │
    ├── RolesModule
    │       ├── imports: PermissionsModule
    │       ├── RolesService
    │       └── RolesRepository
    │
    └── PermissionsModule
            ├── PermissionsService
            └── PermissionsRepository
```

### Module Boundaries

| Module | Exports | Purpose |
|--------|---------|---------|
| ConfigModule | ConfigService | Centralized configuration |
| DatabaseModule | PrismaService | Database access (global) |
| AuthModule | Guards, Strategies | Authentication |
| UsersModule | UsersRepository | User management |
| RolesModule | RolesRepository | Role management |
| PermissionsModule | PermissionsRepository | Permission management |

## Security Architecture

### Authentication Flow

```
Request → JwtAuthGuard → JwtStrategy → AuthService.validate() → User
```

### Authorization Flow

```
User → PermissionsGuard → Query DB for permissions → Compare with required → Allow/Deny
```

### Token Architecture

| Token | Secret | Expiry | Storage | Purpose |
|-------|--------|--------|---------|---------|
| Access | JWT_ACCESS_SECRET | 15m | Client | API authentication |
| Refresh | JWT_REFRESH_SECRET | 7d | DB (hashed) | Token renewal |

## Database Schema

### Entity Relationships

```
┌─────────────┐         ┌─────────────┐
│    User     │────────►│    Role     │
│             │  N:1    │             │
└─────────────┘         └──────┬──────┘
                               │
                               │ N:M
                               │
                        ┌──────▼──────┐
                        │ Permission  │
                        │             │
                        └─────────────┘
```

### Junction Table

`RolePermission` implements the N:M relationship between Role and Permission with cascade delete.

## Design Principles

### 1. Single Responsibility
Each class has one reason to change:
- Controllers: HTTP handling
- Services: Business logic
- Repositories: Data access

### 2. Dependency Inversion
High-level modules don't depend on low-level modules:
- Services depend on Repository interfaces, not Prisma directly

### 3. Open/Closed
System is open for extension, closed for modification:
- New permissions can be added without code changes
- New modules follow the same patterns

### 4. Don't Repeat Yourself (DRY)
Common functionality is centralized:
- Global guards apply to all routes
- Shared decorators in `/common`
- Global DatabaseModule
