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

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture patterns and design principles |
| [FOLDERS.md](./FOLDERS.md) | Project structure and file organization |
| [DATA_FLOW.md](./DATA_FLOW.md) | Data flows and main processes |
| [CONVENTIONS.md](./CONVENTIONS.md) | Naming conventions and coding standards |
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
