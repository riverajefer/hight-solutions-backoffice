# Folder Structure

## Root Directory

```
hight-solutions-backoffice/
├── docs/                    # Technical documentation (this folder)
├── prisma/                  # Database schema and migrations
├── src/                     # Application source code
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── nest-cli.json            # NestJS CLI configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── tsconfig.build.json      # TypeScript build configuration
```

## Source Code Structure

```
src/
├── main.ts                  # Application entry point
├── app.module.ts            # Root module
├── common/                  # Shared utilities and cross-cutting concerns
├── config/                  # Application configuration
├── database/                # Database layer
└── modules/                 # Feature modules
```

## Common Directory (`/src/common/`)

Contains shared code used across multiple modules.

```
common/
├── decorators/              # Custom decorators
│   ├── current-user.decorator.ts     # Extract user from request
│   ├── public.decorator.ts           # Mark routes as public
│   ├── require-permissions.decorator.ts  # Define required permissions
│   └── index.ts                      # Re-exports
├── guards/                  # Authorization guards
│   ├── permissions.guard.ts          # Dynamic permission checking
│   └── index.ts
├── interfaces/              # Shared TypeScript interfaces
│   ├── auth.interface.ts             # JWT and user types
│   └── index.ts
├── interceptors/            # Request/response interceptors (placeholders)
│   ├── logging.interceptor.ts
│   └── transform.interceptor.ts
├── pipes/                   # Validation pipes (placeholders)
│   └── validation.pipe.ts
├── dto/                     # Shared DTOs
│   └── pagination.dto.ts
└── utils/                   # Utility functions
    └── helpers.ts
```

### When to use `/common/`
- Code that is used by **2 or more modules**
- Cross-cutting concerns (guards, interceptors, decorators)
- Shared interfaces and types
- Utility functions

## Config Directory (`/src/config/`)

Centralized configuration management.

```
config/
├── config.module.ts         # Configuration module setup
├── app.config.ts            # Application settings (port, env)
├── database.config.ts       # Database connection settings
├── jwt.config.ts            # JWT secrets and expiration
└── index.ts                 # Re-exports
```

### Configuration Files Purpose

| File | Purpose | Variables |
|------|---------|-----------|
| `app.config.ts` | App settings | PORT, NODE_ENV, FRONTEND_URL |
| `database.config.ts` | Database | DATABASE_URL |
| `jwt.config.ts` | JWT tokens | JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, expirations |

## Database Directory (`/src/database/`)

Database connection and ORM setup.

```
database/
├── database.module.ts       # @Global module exporting PrismaService
├── prisma.service.ts        # Prisma client with lifecycle hooks
├── seeds/
│   └── seed.ts              # Initial data seeding
└── index.ts                 # Re-exports
```

### Key Responsibilities
- Provide global `PrismaService` to all modules
- Handle database connection lifecycle
- Implement seed scripts for development

## Modules Directory (`/src/modules/`)

Feature modules following the same internal structure.

```
modules/
├── auth/                    # Authentication module
├── users/                   # User management module
├── roles/                   # Role management module
└── permissions/             # Permission management module
```

### Standard Module Structure

Each module follows this structure:

```
<module>/
├── <module>.module.ts       # Module definition
├── <module>.controller.ts   # HTTP endpoints
├── <module>.service.ts      # Business logic
├── <module>.repository.ts   # Data access (if needed)
└── dto/
    ├── <module>.dto.ts      # Data transfer objects
    └── index.ts             # Re-exports
```

### Auth Module (`/src/modules/auth/`)

Special structure for authentication:

```
auth/
├── auth.module.ts           # Module configuration
├── auth.controller.ts       # Auth endpoints (login, register, etc.)
├── auth.service.ts          # Authentication logic
├── dto/
│   ├── auth.dto.ts          # LoginDto, RegisterDto, RefreshTokenDto
│   └── index.ts
├── guards/
│   ├── jwt-auth.guard.ts    # JWT token validation guard
│   ├── local-auth.guard.ts  # Username/password guard
│   └── index.ts
└── strategies/
    ├── jwt.strategy.ts      # JWT Passport strategy
    ├── local.strategy.ts    # Local Passport strategy
    └── index.ts
```

### Users Module (`/src/modules/users/`)

```
users/
├── users.module.ts          # Imports RolesModule
├── users.controller.ts      # CRUD endpoints
├── users.service.ts         # User business logic
├── users.repository.ts      # User data access
└── dto/
    ├── user.dto.ts          # CreateUserDto, UpdateUserDto
    └── index.ts
```

### Roles Module (`/src/modules/roles/`)

```
roles/
├── roles.module.ts          # Imports PermissionsModule
├── roles.controller.ts      # CRUD + permission assignment endpoints
├── roles.service.ts         # Role business logic
├── roles.repository.ts      # Role data access
└── dto/
    ├── role.dto.ts          # CreateRoleDto, UpdateRoleDto, AssignPermissionsDto
    └── index.ts
```

### Permissions Module (`/src/modules/permissions/`)

```
permissions/
├── permissions.module.ts    # Base module
├── permissions.controller.ts # CRUD endpoints
├── permissions.service.ts   # Permission business logic
├── permissions.repository.ts # Permission data access
└── dto/
    ├── permission.dto.ts    # CreatePermissionDto, UpdatePermissionDto
    └── index.ts
```

## Prisma Directory (`/prisma/`)

Database schema and migrations.

```
prisma/
├── schema.prisma            # Database schema definition
├── migrations/              # Database migrations
│   └── 20260113180942_init/ # Initial migration
│       └── migration.sql
└── dev.db                   # SQLite database file (development)
```

## File Naming Conventions

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

## Import Aliases

TypeScript path aliases are configured in `tsconfig.json`:

```typescript
// Instead of relative imports
import { PrismaService } from '../../../database/prisma.service';

// Use aliases
import { PrismaService } from '@/database';
import { RequirePermissions } from '@common/decorators';
import { AuthService } from '@modules/auth/auth.service';
```

### Available Aliases

| Alias | Path |
|-------|------|
| `@/*` | `src/*` |
| `@modules/*` | `src/modules/*` |
| `@common/*` | `src/common/*` |
| `@config/*` | `src/config/*` |
