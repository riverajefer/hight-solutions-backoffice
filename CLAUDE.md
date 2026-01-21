# CLAUDE.md - Guía para IA

## Proyecto: Hight Solutions Backoffice

Sistema completo de backoffice con autenticación JWT y control de acceso basado en roles (RBAC).

---

## Índice

1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Arquitectura](#arquitectura)
5. [Guías de Desarrollo](#guías-de-desarrollo)
6. [Convenciones y Patrones](#convenciones-y-patrones)
7. [Comandos Útiles](#comandos-útiles)
8. [Flujos Principales](#flujos-principales)
9. [Documentación Adicional](#documentación-adicional)

---

## Descripción General

**Hight Solutions Backoffice** es un sistema fullstack profesional que proporciona:

- **Backend**: API REST con NestJS + Prisma + SQLite
- **Frontend**: Aplicación React con Material UI + Zustand + React Query
- **Autenticación**: JWT con access y refresh tokens
- **Autorización**: Sistema RBAC dinámico basado en permisos
- **Seguridad**: Hashing de contraseñas, validación de datos, guards

### Módulos Implementados

| Módulo | Descripción | Permisos |
|--------|-------------|----------|
| Users | Gestión de usuarios | create_users, read_users, update_users, delete_users |
| Roles | Gestión de roles | create_roles, read_roles, update_roles, delete_roles |
| Permissions | Gestión de permisos | create_permissions, read_permissions, update_permissions, delete_permissions |

---

## Stack Tecnológico

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.9.x |
| ORM | Prisma | 7.2.x |
| Database | SQLite | better-sqlite3 |
| Authentication | Passport + JWT | - |
| Password Hashing | bcrypt | 12 rounds |
| Validation | class-validator | - |
| API Documentation | Swagger/OpenAPI | - |

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Language | TypeScript | 5.x |
| UI Library | Material UI | 5.x |
| State Management | Zustand | 4.x |
| Forms | React Hook Form + Zod | - |
| Data Fetching | React Query | 5.x |
| HTTP Client | Axios | 1.x |
| Routing | React Router | 6.x |
| Notifications | notistack | 3.x |

---

## Estructura del Proyecto

```
hight-solutions-backoffice/
├── backend/                           # Backend NestJS
│   ├── src/
│   │   ├── common/                    # Código compartido
│   │   │   ├── decorators/            # Custom decorators
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── require-permissions.decorator.ts
│   │   │   ├── guards/                # Guards de autorización
│   │   │   │   └── permissions.guard.ts
│   │   │   └── interfaces/            # Interfaces compartidas
│   │   │       └── auth.interface.ts
│   │   ├── modules/
│   │   │   ├── auth/                  # Módulo de autenticación
│   │   │   │   ├── dto/               # Data Transfer Objects
│   │   │   │   ├── guards/            # JWT y Local guards
│   │   │   │   ├── strategies/        # Passport strategies
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── users/                 # Módulo de usuarios
│   │   │   │   ├── dto/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.repository.ts
│   │   │   ├── roles/                 # Módulo de roles
│   │   │   ├── permissions/           # Módulo de permisos
│   │   │   └── database/              # Módulo de base de datos
│   │   │       └── prisma.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma              # Schema de base de datos
│   │   └── seed.ts                    # Datos iniciales
│   ├── docs/
│   │   └── ai-guides/                 # Guías para IA
│   │       ├── README.md
│   │       ├── ARCHITECTURE.md
│   │       ├── CONVENTIONS.md
│   │       ├── DATA_FLOW.md
│   │       ├── FOLDERS.md
│   │       ├── 01-CRUD-MODULE-TEMPLATE.md
│   │       ├── 02-PRISMA-RELATIONS-GUIDE.md
│   │       ├── 03-GUARDS-DECORATORS-GUIDE.md
│   │       ├── 04-DTOS-VALIDATION-GUIDE.md
│   │       └── 05-AI-PROMPT-TEMPLATE.md
│   └── package.json
│
├── frontend/                          # Frontend React
│   ├── src/
│   │   ├── api/                       # API services
│   │   │   ├── axios.ts               # Axios instance
│   │   │   ├── auth.api.ts
│   │   │   ├── users.api.ts
│   │   │   ├── roles.api.ts
│   │   │   └── permissions.api.ts
│   │   ├── components/                # Componentes reutilizables
│   │   │   ├── common/                # Componentes comunes
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── ConfirmDialog.tsx
│   │   │   │   └── PageHeader.tsx
│   │   │   └── layout/                # Componentes de layout
│   │   │       ├── MainLayout.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Topbar.tsx
│   │   ├── pages/                     # Páginas
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   └── permissions/
│   │   ├── hooks/                     # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useUsers.ts
│   │   │   └── useRoles.ts
│   │   ├── store/                     # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   └── uiStore.ts
│   │   ├── types/                     # TypeScript types
│   │   │   ├── auth.types.ts
│   │   │   ├── user.types.ts
│   │   │   ├── role.types.ts
│   │   │   └── permission.types.ts
│   │   ├── utils/                     # Utilidades
│   │   ├── router/                    # Configuración de rutas
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── docs/                          # Documentación del frontend
│   │   ├── FRONTEND_ARCHITECTURE.md
│   │   ├── FRONTEND_SETUP.md
│   │   └── GET_STARTED.md
│   └── package.json
│
├── CLAUDE.md                          # Este archivo
└── README.md                          # README principal
```

---

## Arquitectura

### Backend: Layered Architecture + Repository Pattern

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

**Principios:**
- Controllers manejan HTTP, NO lógica de negocio
- Services implementan reglas de negocio
- Repositories acceden a datos, NO lógica de negocio
- Separación clara de responsabilidades

### Frontend: Component-Based Architecture

```
App.tsx (root)
  ├── Router (React Router)
  │   ├── AuthLayout
  │   │   ├── LoginPage
  │   │   └── RegisterPage
  │   └── MainLayout
  │       ├── Sidebar
  │       ├── Topbar
  │       └── Routes
  │           ├── DashboardPage
  │           ├── UsersModule
  │           ├── RolesModule
  │           └── PermissionsModule
  ├── Providers
  │   ├── QueryClientProvider
  │   ├── SnackbarProvider
  │   └── ThemeProvider
```

**Flujo de datos:**
1. Usuario interactúa con UI
2. Componentes capturan eventos
3. Hooks manejan lógica (useUsers, useRoles)
4. Zustand Store almacena estado global
5. React Query gestiona datos del servidor
6. Axios realiza peticiones HTTP
7. Backend API procesa y responde

---

## Guías de Desarrollo

### Para Backend: Crear Nuevo Módulo CRUD

**IMPORTANTE**: Antes de crear un nuevo módulo, lee estos archivos:

1. `backend/docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md` - Template completo de CRUD
2. `backend/docs/ai-guides/ARCHITECTURE.md` - Arquitectura del proyecto
3. `backend/docs/ai-guides/CONVENTIONS.md` - Convenciones de código
4. `backend/docs/ai-guides/04-DTOS-VALIDATION-GUIDE.md` - Validación de DTOs

**Pasos:**

1. **Define el modelo en Prisma** (`prisma/schema.prisma`)
   ```prisma
   model Entity {
     id        String   @id @default(uuid())
     name      String   @unique
     createdAt DateTime @default(now()) @map("created_at")
     updatedAt DateTime @updatedAt @map("updated_at")

     @@map("entities")
   }
   ```

2. **Genera el módulo NestJS**
   ```bash
   nest g module modules/entity
   nest g controller modules/entity
   nest g service modules/entity
   ```

3. **Crea el repository** (`entity.repository.ts`)
   - Inyecta PrismaService
   - Implementa métodos CRUD básicos
   - Maneja relaciones con includes

4. **Crea los DTOs** (`dto/`)
   - CreateEntityDto: todos los campos requeridos
   - UpdateEntityDto: todos los campos opcionales
   - Usa decoradores de class-validator

5. **Implementa el service**
   - Inyecta repository
   - Valida lógica de negocio
   - Maneja errores (NotFoundException, BadRequestException)

6. **Implementa el controller**
   - Aplica guards: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
   - Define permisos: `@RequirePermissions('create_entity')`
   - Documenta con Swagger: `@ApiOperation`, `@ApiResponse`

7. **Agrega permisos al seed** (`prisma/seed.ts`)
   ```typescript
   const permissions = [
     { name: 'create_entity', description: 'Crear entidad' },
     { name: 'read_entity', description: 'Leer entidad' },
     { name: 'update_entity', description: 'Actualizar entidad' },
     { name: 'delete_entity', description: 'Eliminar entidad' },
   ];
   ```

8. **Ejecuta migración**
   ```bash
   npx prisma migrate dev --name add_entity
   npm run prisma:seed
   ```

### Para Frontend: Crear Nueva Página/Módulo

**Pasos:**

1. **Crea los tipos TypeScript** (`src/types/entity.types.ts`)
   ```typescript
   export interface Entity {
     id: string;
     name: string;
     createdAt: string;
     updatedAt: string;
   }

   export interface CreateEntityDto {
     name: string;
   }

   export interface UpdateEntityDto {
     name?: string;
   }
   ```

2. **Crea el API service** (`src/api/entity.api.ts`)
   ```typescript
   import { axiosInstance } from './axios';

   export const entityApi = {
     getAll: async () => {
       const { data } = await axiosInstance.get('/entities');
       return data;
     },
     create: async (dto: CreateEntityDto) => {
       const { data } = await axiosInstance.post('/entities', dto);
       return data;
     },
     // ... update, delete
   };
   ```

3. **Crea el custom hook** (`src/hooks/useEntity.ts`)
   ```typescript
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

   export const useEntity = () => {
     const queryClient = useQueryClient();

     const entityQuery = useQuery({
       queryKey: ['entities'],
       queryFn: () => entityApi.getAll(),
     });

     const createMutation = useMutation({
       mutationFn: (data) => entityApi.create(data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['entities'] });
       },
     });

     return { entityQuery, createMutation };
   };
   ```

4. **Crea los componentes de página**
   - `EntityListPage.tsx` - Lista con DataTable
   - `EntityFormPage.tsx` - Formulario con React Hook Form + Zod

5. **Agrega las rutas** (`src/router/index.tsx`)
   ```typescript
   <Route path="/entities" element={
     <PermissionGuard permission="read_entity">
       <EntityListPage />
     </PermissionGuard>
   } />
   ```

6. **Agrega al menú** (`src/components/layout/Sidebar.tsx`)
   ```typescript
   {
     label: 'Entidades',
     path: '/entities',
     icon: <ListIcon />,
     permission: 'read_entity',
   }
   ```

---

## Convenciones y Patrones

### Backend

#### Naming Conventions

| Tipo | Pattern | Ejemplo |
|------|---------|---------|
| Module | `<name>.module.ts` | `users.module.ts` |
| Controller | `<name>.controller.ts` | `users.controller.ts` |
| Service | `<name>.service.ts` | `users.service.ts` |
| Repository | `<name>.repository.ts` | `users.repository.ts` |
| DTO | `<action>-<entity>.dto.ts` | `create-user.dto.ts` |
| Guard | `<name>.guard.ts` | `permissions.guard.ts` |
| Decorator | `<name>.decorator.ts` | `current-user.decorator.ts` |

#### Patrones de Código

**Controller Pattern:**
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
}
```

**Service Pattern:**
```typescript
@Injectable()
export class EntityService {
  constructor(
    private readonly repository: EntityRepository,
  ) {}

  async findOne(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return entity;
  }
}
```

**Repository Pattern:**
```typescript
@Injectable()
export class EntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.entity.findUnique({
      where: { id },
    });
  }
}
```

### Frontend

#### Naming Conventions

| Tipo | Pattern | Ejemplo |
|------|---------|---------|
| Component | PascalCase | `UserList.tsx`, `DataTable.tsx` |
| Page | PascalCase + Page | `UsersPage.tsx`, `LoginPage.tsx` |
| Hook | camelCase + use prefix | `useAuth.ts`, `useUsers.ts` |
| API Service | camelCase + Api suffix | `usersApi.ts`, `authApi.ts` |
| Type | PascalCase | `User`, `CreateUserDto` |
| Store | camelCase + Store suffix | `authStore.ts`, `uiStore.ts` |

#### Patrones de Código

**Component with React Query:**
```typescript
export const UsersList: React.FC = () => {
  const { usersQuery } = useUsers();

  if (usersQuery.isLoading) return <LoadingSpinner />;
  if (usersQuery.isError) return <ErrorMessage />;

  const users = usersQuery.data || [];

  return (
    <DataTable
      columns={columns}
      rows={users}
    />
  );
};
```

**Form with React Hook Form + Zod:**
```typescript
const schema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nombre requerido'),
});

export const UserForm: React.FC = () => {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
    </form>
  );
};
```

---

## Comandos Útiles

### Backend

```bash
# Desarrollo
npm run start:dev           # Iniciar con hot-reload

# Base de datos
npm run prisma:generate     # Generar cliente Prisma
npm run prisma:migrate      # Ejecutar migraciones
npm run prisma:seed         # Ejecutar seed
npm run prisma:studio       # Abrir Prisma Studio
npm run db:setup            # Migración inicial + seed
npm run db:reset            # Resetear BD + seed

# Testing
npm run test                # Ejecutar tests
npm run test:e2e            # Tests e2e

# Producción
npm run build               # Compilar
npm run start:prod          # Iniciar en producción
```

### Frontend

```bash
# Desarrollo
npm run dev                 # Iniciar dev server

# Build
npm run build               # Build para producción
npm run preview             # Previsualizar build

# Linting
npm run lint                # Ejecutar ESLint
```

---

## Flujos Principales

### Flujo de Autenticación

```
1. Usuario ingresa credenciales
   ↓
2. Frontend → POST /api/v1/auth/login
   ↓
3. Backend valida credenciales (bcrypt)
   ↓
4. Backend genera JWT access + refresh tokens
   ↓
5. Backend carga permisos del usuario
   ↓
6. Frontend recibe: { accessToken, refreshToken, user, permissions }
   ↓
7. Frontend guarda en Zustand + localStorage
   ↓
8. Axios interceptor agrega token en requests
   ↓
9. Si 401 → intenta refresh automáticamente
   ↓
10. Si refresh falla → logout automático
```

### Flujo de Autorización (RBAC)

```
1. Request con JWT token
   ↓
2. JwtAuthGuard valida token
   ↓
3. JwtStrategy extrae payload
   ↓
4. AuthService.validate() carga usuario + rol + permisos
   ↓
5. PermissionsGuard lee metadata de @RequirePermissions
   ↓
6. Compara permisos del usuario vs permisos requeridos
   ↓
7. Si tiene permisos → continúa
   Si NO tiene permisos → ForbiddenException (403)
```

### Flujo de Creación de Entidad (CRUD)

**Backend:**
```
1. Controller recibe DTO
   ↓
2. Validación con class-validator
   ↓
3. Guards (Auth + Permissions)
   ↓
4. Service valida lógica de negocio
   ↓
5. Repository ejecuta query Prisma
   ↓
6. Retorna entidad creada
```

**Frontend:**
```
1. Usuario completa formulario
   ↓
2. Validación con Zod
   ↓
3. onSubmit → createMutation.mutateAsync()
   ↓
4. Axios POST a API
   ↓
5. React Query invalida cache
   ↓
6. UI se actualiza automáticamente
   ↓
7. Notificación de éxito/error
```

---

## Documentación Adicional

### Backend

- **[backend/docs/ai-guides/README.md](./backend/docs/ai-guides/README.md)** - Índice de guías
- **[backend/docs/ai-guides/ARCHITECTURE.md](./backend/docs/ai-guides/ARCHITECTURE.md)** - Arquitectura completa
- **[backend/docs/ai-guides/CONVENTIONS.md](./backend/docs/ai-guides/CONVENTIONS.md)** - Convenciones detalladas
- **[backend/docs/ai-guides/DATA_FLOW.md](./backend/docs/ai-guides/DATA_FLOW.md)** - Flujos de datos
- **[backend/docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md](./backend/docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md)** - Template CRUD
- **[backend/docs/ai-guides/02-PRISMA-RELATIONS-GUIDE.md](./backend/docs/ai-guides/02-PRISMA-RELATIONS-GUIDE.md)** - Relaciones Prisma
- **[backend/docs/ai-guides/03-GUARDS-DECORATORS-GUIDE.md](./backend/docs/ai-guides/03-GUARDS-DECORATORS-GUIDE.md)** - Guards y decoradores
- **[backend/docs/ai-guides/04-DTOS-VALIDATION-GUIDE.md](./backend/docs/ai-guides/04-DTOS-VALIDATION-GUIDE.md)** - Validación de DTOs
- **[backend/docs/ai-guides/05-AI-PROMPT-TEMPLATE.md](./backend/docs/ai-guides/05-AI-PROMPT-TEMPLATE.md)** - Template de prompts

### Frontend

- **[frontend/FRONTEND_ARCHITECTURE.md](./frontend/FRONTEND_ARCHITECTURE.md)** - Arquitectura del frontend
- **[frontend/FRONTEND_SETUP.md](./frontend/FRONTEND_SETUP.md)** - Setup del frontend
- **[frontend/GET_STARTED.md](./frontend/GET_STARTED.md)** - Guía de inicio rápido
- **[frontend/README.md](./frontend/README.md)** - README del frontend

### General

- **[README.md](./README.md)** - README principal del proyecto

---

## Reglas Importantes

### Al Crear Nuevo Código

1. **SIEMPRE** lee las guías correspondientes antes de crear un módulo
2. **SIEMPRE** sigue las convenciones de nombres
3. **SIEMPRE** aplica Guards (JwtAuthGuard + PermissionsGuard) en controllers
4. **SIEMPRE** valida DTOs con class-validator (backend) o Zod (frontend)
5. **SIEMPRE** maneja errores apropiadamente
6. **SIEMPRE** documenta endpoints con Swagger
7. **SIEMPRE** agrega permisos al seed si creas nuevos recursos

### Al Modificar Código Existente

1. **MANTÉN** la consistencia con el código existente
2. **NO CAMBIES** la arquitectura sin justificación
3. **ACTUALIZA** la documentación si cambias funcionalidad
4. **PRUEBA** los cambios antes de commitear

### Principios de Diseño

1. **Separation of Concerns**: Cada capa tiene una responsabilidad
2. **DRY**: No repitas código, crea utilidades/helpers
3. **SOLID**: Especialmente Single Responsibility
4. **Type Safety**: Usa TypeScript al máximo
5. **Security First**: Valida entrada, sanitiza salida, usa permisos

---

## Usuarios de Prueba

| Email | Password | Rol | Permisos |
|-------|----------|-----|----------|
| admin@example.com | admin123 | admin | Todos los permisos |
| manager@example.com | manager123 | manager | create_users, read_users, update_users, read_roles, read_permissions |
| user@example.com | user123 | user | read_users, read_roles |

---

## Endpoints Principales

### Auth
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Usuario actual

### Users
- `GET /api/v1/users` - Listar usuarios
- `GET /api/v1/users/:id` - Obtener usuario
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Roles
- `GET /api/v1/roles` - Listar roles
- `GET /api/v1/roles/:id` - Obtener rol
- `POST /api/v1/roles` - Crear rol
- `PUT /api/v1/roles/:id` - Actualizar rol
- `DELETE /api/v1/roles/:id` - Eliminar rol
- `PUT /api/v1/roles/:id/permissions` - Asignar permisos

### Permissions
- `GET /api/v1/permissions` - Listar permisos
- `GET /api/v1/permissions/:id` - Obtener permiso
- `POST /api/v1/permissions` - Crear permiso
- `POST /api/v1/permissions/bulk` - Crear múltiples
- `PUT /api/v1/permissions/:id` - Actualizar permiso
- `DELETE /api/v1/permissions/:id` - Eliminar permiso

---

## Quick Start para Desarrollo

```bash
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. Configurar base de datos
npm run db:setup

# 3. Iniciar backend
npm run start:dev

# 4. En otra terminal, instalar frontend
cd ../frontend
npm install

# 5. Iniciar frontend
npm run dev

# 6. Abrir navegador en http://localhost:5173
# 7. Login con admin@example.com / admin123
```

---

## Contacto y Soporte

Para preguntas o problemas:

1. Revisa la documentación en `backend/docs/ai-guides/`
2. Revisa la documentación del frontend en `frontend/docs/`
3. Consulta este archivo (CLAUDE.md) para guía general
4. Verifica los logs del backend y frontend
5. Usa Prisma Studio para inspeccionar la base de datos: `npm run prisma:studio`

---

**Última actualización**: 2026-01-21

**Versión del proyecto**: 1.0.0

**Mantenedor**: Hight Solutions Team
