# NestJS Auth RBAC

Backend profesional con autenticación JWT y control de acceso basado en roles (RBAC) usando NestJS, Prisma y Passport.

## 🚀 Stack Tecnológico

- **Framework**: NestJS
- **ORM**: Prisma
- **Base de datos**: SQLite (fácil cambio a PostgreSQL/MySQL)
- **Autenticación**: Passport (Local + JWT)
- **Seguridad**: bcrypt para hash de passwords

## 📁 Estructura del Proyecto

```
src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # Extrae usuario del request
│   │   ├── public.decorator.ts          # Marca rutas públicas
│   │   └── require-permissions.decorator.ts  # Define permisos requeridos
│   ├── guards/
│   │   └── permissions.guard.ts         # Valida permisos dinámicamente
│   └── interfaces/
│       └── auth.interface.ts            # Tipos de JWT y usuario
├── modules/
│   ├── auth/
│   │   ├── dto/                         # Data Transfer Objects
│   │   ├── guards/                      # JWT y Local guards
│   │   ├── strategies/                  # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   └── prisma/
├── app.module.ts
└── main.ts
```

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd nestjs-auth-rbac

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones y seed
npm run db:setup

# Iniciar en modo desarrollo
npm run start:dev
```

## 🔐 Autenticación

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "roleId": "uuid"
  }
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "userId": "uuid",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Registro
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "nuevo@example.com",
  "password": "password123",
  "roleId": "uuid-del-rol"
}
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

## 👥 RBAC (Control de Acceso por Roles)

### Modelo de Datos

```
User → Role → Permission[]
```

- Un usuario tiene **un rol**
- Un rol tiene **múltiples permisos**
- Los permisos se validan **dinámicamente desde la base de datos**

### Permisos Predefinidos

| Permiso | Descripción |
|---------|-------------|
| `create_users` | Crear usuarios |
| `read_users` | Ver usuarios |
| `update_users` | Actualizar usuarios |
| `delete_users` | Eliminar usuarios |
| `create_roles` | Crear roles |
| `read_roles` | Ver roles |
| `update_roles` | Actualizar roles |
| `delete_roles` | Eliminar roles |
| `create_permissions` | Crear permisos |
| `read_permissions` | Ver permisos |
| `update_permissions` | Actualizar permisos |
| `delete_permissions` | Eliminar permisos |
| `manage_permissions` | Asignar permisos a roles |

### Roles Predefinidos

| Rol | Permisos |
|-----|----------|
| `admin` | Todos los permisos |
| `manager` | create_users, read_users, update_users, read_roles, read_permissions |
| `user` | read_users, read_roles |

### Uso en Controladores

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {

  @Get()
  @RequirePermissions('read_users')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @RequirePermissions('create_users')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_users')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

## 📡 API Endpoints

### Auth
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/login` | Iniciar sesión | ❌ |
| POST | `/api/v1/auth/register` | Registrar usuario | ❌ |
| POST | `/api/v1/auth/refresh` | Refrescar token | ❌ |
| POST | `/api/v1/auth/logout` | Cerrar sesión | ✅ |
| POST | `/api/v1/auth/me` | Usuario actual | ✅ |

### Users
| Método | Endpoint | Descripción | Permiso |
|--------|----------|-------------|---------|
| GET | `/api/v1/users` | Listar usuarios | `read_users` |
| GET | `/api/v1/users/:id` | Obtener usuario | `read_users` |
| POST | `/api/v1/users` | Crear usuario | `create_users` |
| PUT | `/api/v1/users/:id` | Actualizar usuario | `update_users` |
| DELETE | `/api/v1/users/:id` | Eliminar usuario | `delete_users` |

### Roles
| Método | Endpoint | Descripción | Permiso |
|--------|----------|-------------|---------|
| GET | `/api/v1/roles` | Listar roles | `read_roles` |
| GET | `/api/v1/roles/:id` | Obtener rol | `read_roles` |
| POST | `/api/v1/roles` | Crear rol | `create_roles` |
| PUT | `/api/v1/roles/:id` | Actualizar rol | `update_roles` |
| DELETE | `/api/v1/roles/:id` | Eliminar rol | `delete_roles` |
| PUT | `/api/v1/roles/:id/permissions` | Asignar permisos | `manage_permissions` |
| POST | `/api/v1/roles/:id/permissions` | Agregar permisos | `manage_permissions` |
| DELETE | `/api/v1/roles/:id/permissions` | Remover permisos | `manage_permissions` |

### Permissions
| Método | Endpoint | Descripción | Permiso |
|--------|----------|-------------|---------|
| GET | `/api/v1/permissions` | Listar permisos | `read_permissions` |
| GET | `/api/v1/permissions/:id` | Obtener permiso | `read_permissions` |
| POST | `/api/v1/permissions` | Crear permiso | `create_permissions` |
| POST | `/api/v1/permissions/bulk` | Crear múltiples | `create_permissions` |
| PUT | `/api/v1/permissions/:id` | Actualizar permiso | `update_permissions` |
| DELETE | `/api/v1/permissions/:id` | Eliminar permiso | `delete_permissions` |

## 🧪 Usuarios de Prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@example.com | admin123 | admin |
| manager@example.com | manager123 | manager |
| user@example.com | user123 | user |

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev      # Iniciar con hot-reload

# Producción
npm run build          # Compilar
npm run start:prod     # Iniciar en producción

# Base de datos
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:seed      # Ejecutar seed
npm run prisma:studio    # Abrir Prisma Studio
npm run db:setup         # Migración inicial + seed
npm run db:reset         # Resetear BD + seed
```

## 🔧 Configuración

Variables de entorno (`.env`):

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_ACCESS_SECRET="tu-secret-access"
JWT_REFRESH_SECRET="tu-secret-refresh"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# App
PORT=3000
NODE_ENV=development
```

## 🔄 Cambiar a PostgreSQL

1. Actualizar `DATABASE_URL` en `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

2. Actualizar `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Regenerar cliente y migrar:
```bash
npm run prisma:generate
npm run prisma:migrate
```
npx kill-port 3000
## 📄 Licencia

MIT
