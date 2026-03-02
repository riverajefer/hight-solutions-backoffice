# NestJS Auth RBAC - BackOffice

## Overview

This is a professional backend application built with **NestJS** that implements **JWT authentication** and **Role-Based Access Control (RBAC)**. It serves as a backoffice system for managing users, roles, and permissions.

## Purpose

The application provides:
- **User Management**: CRUD operations for user accounts
- **Role Management**: Create and manage roles with specific permissions
- **Permission Management**: Granular permission control
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Dynamic permission checking based on user roles

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.9.x |
| ORM | Prisma | 7.2.x |
| Database | SQLite | better-sqlite3 |
| Authentication | Passport + JWT | - |
| Password Hashing | bcrypt | 12 rounds |
| Validation | class-validator | - |
| API Documentation | Swagger/OpenAPI | - |

## Quick Start

```bash
# Install dependencies
npm install

# Setup database (migrate + seed)
npm run db:setup

# Start development server
npm run start:dev
```

## Default Users (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | admin (all permissions) |
| manager@example.com | manager123 | manager (limited) |
| user@example.com | user123 | user (read-only) |

## API Base URL

```
http://localhost:3000/api/v1
```

## Documentation Index

### Core Documentation
| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full architecture overview, design patterns & principles |
| [FOLDERS.md](./FOLDERS.md) | Project structure and file organization |
| [CONVENTIONS.md](./CONVENTIONS.md) | Naming conventions and coding standards |
| [DATA_FLOW.md](./DATA_FLOW.md) | Data flows and main processes |

### AI Development Guides
| Document | Description |
|----------|-------------|
| [01-CRUD-MODULE-TEMPLATE.md](./01-CRUD-MODULE-TEMPLATE.md) | Template for creating new CRUD modules |
| [02-PRISMA-RELATIONS-GUIDE.md](./02-PRISMA-RELATIONS-GUIDE.md) | Guide for Prisma relationships setup |
| [03-GUARDS-DECORATORS-GUIDE.md](./03-GUARDS-DECORATORS-GUIDE.md) | Authentication & authorization patterns |
| [04-DTOS-VALIDATION-GUIDE.md](./04-DTOS-VALIDATION-GUIDE.md) | Data validation best practices |
| [05-AI-PROMPT-TEMPLATE.md](./05-AI-PROMPT-TEMPLATE.md) | Template for AI coding assistance prompts |
| [06-TESTING-GUIDE.md](./06-TESTING-GUIDE.md) | Unit testing guide: setup, patterns, mocks, existing tests |

### Additional Resources
| Document | Description |
|----------|-------------|
| [AUDIT_LOG_SETUP.md](./AUDIT_LOG_SETUP.md) | Audit logging implementation |
| [EXTENSIONS.md](./EXTENSIONS.md) | Guide for adding new features |

## Key Features

### Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (7 days expiry)
- Secure password hashing with bcrypt
- Token type verification in payload

### Authorization
- Dynamic RBAC (database-driven)
- 13 predefined permissions
- 3 predefined roles (admin, manager, user)
- Guard chain pattern (auth + permissions)

### Security
- Input validation on all endpoints
- Password hashing with 12 salt rounds
- Refresh token hashing in database
- Separate secrets for access/refresh tokens

## Available Scripts

```bash
npm run start:dev      # Development with hot-reload
npm run build          # Build for production
npm run start:prod     # Run production build
npm run prisma:studio  # Open database GUI
npm run db:reset       # Reset and reseed database
```

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
PORT=3000
NODE_ENV=development
```

## Swagger Documentation

Access API documentation at: `http://localhost:3000/api`

PROMPT

### Opción 2: Usar directamente con IA
Cuando necesites crear un nuevo módulo, dale este prompt a Claude:
```
Lee los archivos en la carpeta docs/ai-guides/ y genera un nuevo módulo de [NOMBRE] 
siguiendo la arquitectura del proyecto.

Campos del modelo:
- campo1: tipo
- campo2: tipo

[resto de especificaciones]
```

### Opción 3: Usar los templates
Abre `05-AI-PROMPT-TEMPLATE.md`, copia el template apropiado, rellena los detalles y envíalo.

## 💡 Ejemplo de uso rápido:

Si quisieras crear un módulo de **Productos** ahora mismo, usarías este prompt:
```
Necesito crear un módulo de Products para el proyecto High Solutions Backoffice.

Lee primero:
- docs/ai-guides/00-ARCHITECTURE-OVERVIEW.md
- docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md
- docs/ai-guides/04-DTOS-VALIDATION-GUIDE.md

Genera el módulo completo con:
- name: string
- description: string (opcional)
- price: decimal
- stock: number
- categoryId: string (relación con Category)

Permisos: create_products, read_products, update_products, delete_products