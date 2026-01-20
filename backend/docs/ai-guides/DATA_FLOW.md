# Data Flow

## Overview

This document describes the main data flows in the application, including authentication, authorization, and CRUD operations.

## Request Lifecycle

Every HTTP request follows this general flow:

```
HTTP Request
    │
    ▼
┌─────────────────────────┐
│    Global Middleware    │
│  (CORS, Validation)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       Route Match       │
│   (find controller)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│        Guards           │
│  (JwtAuthGuard first)   │
│  (PermissionsGuard)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Interceptors        │
│  (pre-controller)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│        Pipes            │
│  (ValidationPipe)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       Controller        │
│   (route handler)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│        Service          │
│   (business logic)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      Repository         │
│   (data access)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       Database          │
│     (SQLite)            │
└─────────────────────────┘
```

## Authentication Flows

### 1. User Login Flow

```
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

```
┌──────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AuthController.login()                                   │
│         │                                                    │
│         ▼                                                    │
│  2. @UseGuards(LocalAuthGuard)                               │
│         │                                                    │
│         ▼                                                    │
│  3. LocalStrategy.validate(email, password)                  │
│         │                                                    │
│         ▼                                                    │
│  4. AuthService.validateUser()                               │
│         │                                                    │
│         ├── Find user by email (Prisma)                      │
│         │                                                    │
│         ├── Compare password with bcrypt                     │
│         │                                                    │
│         └── Return user (without password)                   │
│                │                                             │
│                ▼                                             │
│  5. AuthService.login(user)                                  │
│         │                                                    │
│         ├── Generate access token (15m)                      │
│         │   Payload: { sub, email, roleId, type: 'access' }  │
│         │                                                    │
│         ├── Generate refresh token (7d)                      │
│         │   Payload: { sub, email, roleId, type: 'refresh' } │
│         │                                                    │
│         ├── Hash refresh token (bcrypt)                      │
│         │                                                    │
│         └── Save hashed token to user.refreshToken           │
│                │                                             │
│                ▼                                             │
│  6. Response:                                                │
│     {                                                        │
│       "accessToken": "eyJ...",                               │
│       "refreshToken": "eyJ...",                              │
│       "user": { id, email, roleId }                          │
│     }                                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2. Protected Endpoint Access

```
GET /api/v1/users
Authorization: Bearer <accessToken>
```

```
┌──────────────────────────────────────────────────────────────┐
│              PROTECTED ENDPOINT ACCESS                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Request received                                         │
│         │                                                    │
│         ▼                                                    │
│  2. @UseGuards(JwtAuthGuard)                                 │
│         │                                                    │
│         ├── Check @Public() decorator → NOT present          │
│         │                                                    │
│         ▼                                                    │
│  3. JwtStrategy.validate(payload)                            │
│         │                                                    │
│         ├── Extract JWT from Authorization header            │
│         │                                                    │
│         ├── Verify signature with JWT_ACCESS_SECRET          │
│         │                                                    │
│         ├── Check expiration                                 │
│         │                                                    │
│         ▼                                                    │
│  4. AuthService.validate(payload)                            │
│         │                                                    │
│         ├── Verify payload.type === 'access'                 │
│         │                                                    │
│         ├── Find user by payload.sub (userId)                │
│         │                                                    │
│         └── Return user object                               │
│                │                                             │
│                ▼                                             │
│  5. request.user = authenticatedUser                         │
│         │                                                    │
│         ▼                                                    │
│  6. @UseGuards(PermissionsGuard)                             │
│         │                                                    │
│         ├── Read @RequirePermissions('read_users')           │
│         │                                                    │
│         ├── Query DB: permissions for user.roleId            │
│         │                                                    │
│         ├── Check: user has 'read_users'?                    │
│         │                                                    │
│         └── YES → Continue | NO → ForbiddenException         │
│                │                                             │
│                ▼                                             │
│  7. Controller.findAll()                                     │
│         │                                                    │
│         ▼                                                    │
│  8. Service.findAll() → Repository.findAll() → Response      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Token Refresh Flow

```
POST /api/v1/auth/refresh
{
  "userId": "uuid",
  "refreshToken": "eyJ..."
}
```

```
┌──────────────────────────────────────────────────────────────┐
│                 TOKEN REFRESH FLOW                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AuthController.refresh(refreshTokenDto)                  │
│         │                                                    │
│         ▼                                                    │
│  2. AuthService.refreshTokens(userId, token)                 │
│         │                                                    │
│         ├── Find user by userId                              │
│         │                                                    │
│         ├── User not found? → ForbiddenException             │
│         │                                                    │
│         ├── No stored refresh token? → ForbiddenException    │
│         │                                                    │
│         ├── Verify refresh token signature                   │
│         │                                                    │
│         ├── Check payload.type === 'refresh'                 │
│         │                                                    │
│         ├── Compare with stored hash (bcrypt)                │
│         │                                                    │
│         └── Tokens don't match? → ForbiddenException         │
│                │                                             │
│                ▼                                             │
│  3. Generate new token pair                                  │
│         │                                                    │
│         ├── New access token (15m)                           │
│         │                                                    │
│         ├── New refresh token (7d)                           │
│         │                                                    │
│         └── Update stored hash in database                   │
│                │                                             │
│                ▼                                             │
│  4. Response:                                                │
│     {                                                        │
│       "accessToken": "new-eyJ...",                           │
│       "refreshToken": "new-eyJ..."                           │
│     }                                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4. Logout Flow

```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

```
┌──────────────────────────────────────────────────────────────┐
│                    LOGOUT FLOW                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Request with valid JWT                                   │
│         │                                                    │
│         ▼                                                    │
│  2. JwtAuthGuard validates token                             │
│         │                                                    │
│         ▼                                                    │
│  3. AuthController.logout(userId)                            │
│         │                                                    │
│         ▼                                                    │
│  4. AuthService.logout(userId)                               │
│         │                                                    │
│         ├── Find user by ID                                  │
│         │                                                    │
│         └── Set user.refreshToken = null                     │
│                │                                             │
│                ▼                                             │
│  5. Response: { message: "Logout successful" }               │
│                                                              │
│  Note: Access token remains valid until expiration           │
│        Refresh token is invalidated immediately              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## CRUD Operation Flows

### Create User Flow

```
POST /api/v1/users
Authorization: Bearer <accessToken>
Body: { email, password, roleId }
```

```
┌──────────────────────────────────────────────────────────────┐
│                   CREATE USER FLOW                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. @RequirePermissions('create_users')                      │
│         │                                                    │
│         ▼                                                    │
│  2. ValidationPipe validates CreateUserDto                   │
│         │                                                    │
│         ├── @IsEmail() on email                              │
│         ├── @MinLength(6) on password                        │
│         └── @IsString() on roleId                            │
│                │                                             │
│                ▼                                             │
│  3. UsersService.create(dto)                                 │
│         │                                                    │
│         ├── Check email uniqueness                           │
│         │   Repository.findByEmail(dto.email)                │
│         │   → Exists? → BadRequestException                  │
│         │                                                    │
│         ├── Validate role exists                             │
│         │   RolesRepository.findById(dto.roleId)             │
│         │   → Not found? → BadRequestException               │
│         │                                                    │
│         ├── Hash password                                    │
│         │   bcrypt.hash(password, 12)                        │
│         │                                                    │
│         └── Create user                                      │
│             UsersRepository.create({ ...dto, password })     │
│                │                                             │
│                ▼                                             │
│  4. Response: User object (without password)                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Role Permission Assignment Flow

```
PUT /api/v1/roles/:id/permissions
Body: { permissionIds: ["uuid1", "uuid2"] }
```

```
┌──────────────────────────────────────────────────────────────┐
│            ASSIGN PERMISSIONS TO ROLE FLOW                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. @RequirePermissions('manage_permissions')                │
│         │                                                    │
│         ▼                                                    │
│  2. RolesService.assignPermissions(roleId, permissionIds)    │
│         │                                                    │
│         ├── Validate role exists                             │
│         │   → Not found? → NotFoundException                 │
│         │                                                    │
│         ├── Validate all permissions exist                   │
│         │   PermissionsRepository.findByIds(permissionIds)   │
│         │   → Some not found? → BadRequestException          │
│         │                                                    │
│         ▼                                                    │
│  3. RolesRepository.replacePermissions(roleId, permissionIds)│
│         │                                                    │
│         └── Transaction:                                     │
│             1. DELETE all from role_permissions              │
│                WHERE roleId = ?                              │
│             2. INSERT new role_permissions                   │
│                │                                             │
│                ▼                                             │
│  4. Response: Updated Role with permissions                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Authorization Check Flow

```
┌──────────────────────────────────────────────────────────────┐
│              PERMISSIONS GUARD FLOW                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PermissionsGuard.canActivate(context)                       │
│         │                                                    │
│         ▼                                                    │
│  1. Read required permissions from decorator metadata        │
│     const required = Reflector.get(PERMISSIONS_KEY)          │
│         │                                                    │
│         ├── No permissions required? → return true           │
│         │                                                    │
│         ▼                                                    │
│  2. Get user from request                                    │
│     const user = request.user                                │
│         │                                                    │
│         ├── No user? → return false                          │
│         │                                                    │
│         ▼                                                    │
│  3. Query user's permissions from database                   │
│     SELECT p.name FROM permissions p                         │
│     JOIN role_permissions rp ON rp.permissionId = p.id       │
│     JOIN roles r ON r.id = rp.roleId                         │
│     WHERE r.id = user.roleId                                 │
│         │                                                    │
│         ▼                                                    │
│  4. Check if user has ALL required permissions               │
│     const hasAll = required.every(p => userPerms.includes(p))│
│         │                                                    │
│         ├── YES → return true (access granted)               │
│         │                                                    │
│         └── NO → throw ForbiddenException                    │
│             Message: "Missing permissions: [list]"           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Data Validation Flow

```
┌──────────────────────────────────────────────────────────────┐
│              VALIDATION PIPE FLOW                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Request Body: { email: "invalid", extra: "field" }          │
│         │                                                    │
│         ▼                                                    │
│  1. Transform to DTO class instance                          │
│     plainToClass(CreateUserDto, body)                        │
│         │                                                    │
│         ▼                                                    │
│  2. Validate with class-validator                            │
│         │                                                    │
│         ├── @IsEmail() → email invalid                       │
│         │                                                    │
│         └── Validation errors collected                      │
│                │                                             │
│                ▼                                             │
│  3. Apply whitelist: true                                    │
│     → Remove 'extra' field (not in DTO)                      │
│         │                                                    │
│         ▼                                                    │
│  4. Apply forbidNonWhitelisted: true                         │
│     → Extra fields cause error                               │
│         │                                                    │
│         ▼                                                    │
│  5. Errors found?                                            │
│         │                                                    │
│         ├── YES → throw BadRequestException                  │
│         │         {                                          │
│         │           "message": ["email must be valid"],      │
│         │           "error": "Bad Request",                  │
│         │           "statusCode": 400                        │
│         │         }                                          │
│         │                                                    │
│         └── NO → Continue to controller                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                ERROR HANDLING FLOW                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Exception thrown in application                             │
│         │                                                    │
│         ▼                                                    │
│  NestJS Exception Filter                                     │
│         │                                                    │
│         ├── HttpException (BadRequest, NotFound, etc.)       │
│         │   → Return exception response                      │
│         │                                                    │
│         └── Unknown Exception                                │
│             → Return 500 Internal Server Error               │
│                │                                             │
│                ▼                                             │
│  Response Format:                                            │
│  {                                                           │
│    "message": "Error description",                           │
│    "error": "Error Type",                                    │
│    "statusCode": 400/401/403/404/500                         │
│  }                                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Database Relationship Queries

### User with Role and Permissions

```typescript
// Repository query pattern
prisma.user.findUnique({
  where: { id },
  include: {
    role: {
      include: {
        permissions: {
          include: {
            permission: true  // Get actual permission data
          }
        }
      }
    }
  }
});
```

### Role with Permission Count

```typescript
prisma.role.findMany({
  include: {
    _count: {
      select: { permissions: true, users: true }
    }
  }
});
```
