# Hight Solutions Backoffice - Frontend

Frontend React + Vite para el sistema de backoffice de Hight Solutions.

## Requisitos Previos

- Node.js 16+
- npm o yarn
- Backend corriendo en `http://localhost:3000` (ver [Backend README](../README.md))

## Instalación

1. Instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto (o usa el `.env.example`):

```bash
cp .env.example .env
```

3. Configura las variables de entorno según tu entorno.

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación se abrirá automáticamente en `http://localhost:5173`

## Build

Para crear una versión optimizada para producción:

```bash
npm run build
```

## Preview

Para previsualizar la versión de producción localmente:

```bash
npm run preview
```

## Lint

Para verificar errores de lint:

```bash
npm run lint
```

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── api/                 # Servicios de API
│   ├── components/          # Componentes reutilizables
│   │   ├── common/         # Componentes genéricos
│   │   ├── guards/         # Guards de autenticación y permisos
│   │   └── layout/         # Componentes de layout
│   ├── features/           # Módulos por funcionalidad
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── roles/
│   │   └── permissions/
│   ├── hooks/              # Custom hooks globales
│   ├── store/              # Estado global (Zustand)
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Utilidades
│   ├── theme/              # Tema de MUI
│   ├── router/             # Configuración de rutas
│   ├── App.tsx             # Componente principal
│   └── main.tsx            # Entry point
├── public/                 # Archivos estáticos
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Usuarios de Prueba

Para probar la aplicación, usa los siguientes usuarios:

| Email | Contraseña | Rol | Permisos |
|-------|------------|-----|----------|
| admin@example.com | admin123 | admin | Todos |
| manager@example.com | manager123 | manager | Lectura de usuarios/roles, crear/actualizar usuarios |
| user@example.com | user123 | user | Lectura de usuarios y roles |

## Características Principales

### Autenticación
- Login y registro
- JWT con access token + refresh token
- Almacenamiento seguro de tokens
- Refresh automático de token

### Control de Acceso
- RBAC (Role-Based Access Control)
- Guards para proteger rutas
- Permisos validados dinámicamente

### Módulos Implementados
- **Dashboard**: Panel con estadísticas
- **Usuarios**: CRUD completo
- **Roles**: CRUD con asignación de permisos
- **Permisos**: Listado y gestión

### UI/UX
- Diseño responsive
- Tema claro/oscuro
- Notificaciones (Snackbar)
- Diálogos de confirmación
- Formularios validados
- Tablas con paginación

## Tecnologías Utilizadas

- **React 18+**: Librería principal
- **Vite**: Bundler moderno
- **TypeScript**: Tipado estricto
- **Zustand**: Manejo de estado global
- **Material UI v5+**: Componentes y diseño
- **React Router DOM v6+**: Enrutamiento
- **Axios**: Cliente HTTP
- **React Query**: Cache y sincronización de datos
- **React Hook Form + Zod**: Formularios y validación
- **notistack**: Notificaciones
- **date-fns**: Manejo de fechas

## Gestión de Estado

### Zustand Stores

#### AuthStore
Almacena la información de autenticación y permisos del usuario actual.

```typescript
const { user, accessToken, refreshToken, permissions, isAuthenticated, login, logout, hasPermission } = useAuthStore();
```

#### UIStore
Almacena el estado de la interfaz (sidebar, tema).

```typescript
const { sidebarOpen, theme, toggleSidebar, toggleTheme } = useUIStore();
```

## API Integration

### Axios Configuration
- Instancia centralizada en `src/api/axios.ts`
- Interceptors para agregar token automáticamente
- Refresh token automático en caso de 401

### Servicios de API
- `authApi`: Autenticación
- `usersApi`: CRUD de usuarios
- `rolesApi`: CRUD de roles
- `permissionsApi`: CRUD de permisos

## React Query

Todas las consultas a la API están optimizadas con React Query:
- Caching automático
- Invalidación de queries
- Manejo de estados de carga
- Reintentos automáticos

### Hooks Personalizados
- `useAuth()`: Autenticación
- `useUsers()`: Gestión de usuarios
- `useRoles()`: Gestión de roles
- `usePermissions()`: Gestión de permisos

## Validación de Formularios

Se usan **React Hook Form** + **Zod** para validación:

```typescript
const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

## Componentes Principales

### Componentes Comunes
- `ConfirmDialog`: Modal de confirmación
- `DataTable`: Tabla genérica con paginación
- `LoadingSpinner`: Indicador de carga
- `SearchInput`: Input de búsqueda
- `PageHeader`: Header de página con breadcrumbs

### Componentes de Layout
- `MainLayout`: Layout principal con sidebar
- `Sidebar`: Menú lateral responsive
- `Topbar`: Barra superior
- `AuthLayout`: Layout para páginas de auth

### Guards
- `AuthGuard`: Protege rutas autenticadas
- `PermissionGuard`: Protege por permisos

## Manejo de Errores

La aplicación implementa un manejo robusto de errores:
- Interceptors en Axios para capturar errores globales
- Mensajes de error claros en formularios
- Notificaciones de error con Snackbar
- Fallback en componentes

## Responsive Design

La aplicación es completamente responsive:
- Breakpoints de Material UI (xs, sm, md, lg, xl)
- Sidebar colapsable en móvil
- Tablas adaptables
- Formularios responsivos

## Performance

Optimizaciones implementadas:
- Lazy loading de páginas
- Suspense boundaries
- Memoization de componentes
- React Query caching
- Vite bundling optimizado

## Troubleshooting

### El backend no responde
Asegúrate de que el backend esté corriendo en `http://localhost:3000`

### Error de CORS
Verifica que el backend tenga CORS configurado para `http://localhost:5173`

### Token expirado
El refresh token se maneja automáticamente. Si sigue dando problemas, limpia localStorage.

## Scripts Disponibles

- `npm run dev`: Inicia servidor de desarrollo
- `npm run build`: Build para producción
- `npm run preview`: Preview del build
- `npm run lint`: Verificar linting

## Contribución

Para contribuir al proyecto:
1. Crea una rama desde `main`
2. Realiza tus cambios
3. Ejecuta `npm run lint` antes de hacer commit
4. Abre un PR

## Licencia

Propiedad de Hight Solutions
