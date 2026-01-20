# Documentación Técnica - Frontend Hight Solutions Backoffice

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Capa de API](#capa-de-api)
3. [Estado Global (Zustand)](#estado-global-zustand)
4. [Rutas y Navegación](#rutas-y-navegación)
5. [Componentes](#componentes)
6. [Formularios y Validación](#formularios-y-validación)
7. [Interceptores y Manejo de Errores](#interceptores-y-manejo-de-errores)
8. [React Query Integration](#react-query-integration)
9. [TypeScript](#typescript)
10. [Performance](#performance)

---

## Arquitectura General

El frontend sigue una arquitectura modular y escalable:

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

### Flujo de Datos

1. **Usuario** interactúa con la UI
2. **Componentes** capturan eventos (clicks, cambios en formularios)
3. **Hooks** (useUsers, useRoles, etc.) manejan la lógica
4. **Zustand Store** almacena estado global
5. **React Query** gestiona datos del servidor
6. **Axios** realiza peticiones HTTP
7. **Backend API** procesa y responde

---

## Capa de API

### Configuración de Axios

```typescript
// src/api/axios.ts
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de request: agrega token
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: maneja 401 y refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Intenta refresh token
      await useAuthStore.getState().refreshAccessToken();
      // Reintenta la solicitud
      return axiosInstance(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

### Servicios de API

Cada módulo tiene su servicio:

```typescript
// src/api/users.api.ts
export const usersApi = {
  getAll: async (params?) => { /* ... */ },
  getById: async (id) => { /* ... */ },
  create: async (data) => { /* ... */ },
  update: async (id, data) => { /* ... */ },
  delete: async (id) => { /* ... */ },
};
```

**Ventajas:**
- Centralización de endpoints
- Fácil de testear
- Reutilizable en toda la app

---

## Estado Global (Zustand)

### AuthStore

Almacena autenticación y permisos:

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}
```

**Uso:**
```typescript
const { user, permissions, login, hasPermission } = useAuthStore();

// Verificar permiso
if (hasPermission('create_users')) {
  // Mostrar botón crear usuario
}
```

### UIStore

Almacena estado de UI:

```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  toggleTheme: () => void;
}
```

**Persistencia:**
- AuthStore persiste en localStorage (automaticamente con middleware `persist`)
- UIStore es en memoria

---

## Rutas y Navegación

### Configuración de Rutas

```typescript
// src/router/index.tsx
<Routes>
  {/* Rutas públicas */}
  <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
  
  {/* Rutas protegidas */}
  <Route element={<AuthGuard><MainLayout>...</MainLayout></AuthGuard>}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/users" element={<PermissionGuard permission="read_users"><UsersListPage /></PermissionGuard>} />
  </Route>
</Routes>
```

### Guards

**AuthGuard**: Redirige a login si no está autenticado
```typescript
<AuthGuard>
  <ProtectedComponent />
</AuthGuard>
```

**PermissionGuard**: Oculta contenido si no tiene permisos
```typescript
<PermissionGuard permission="create_users">
  <CreateUserButton />
</PermissionGuard>
```

---

## Componentes

### Componentes Comunes

#### DataTable
Tabla genérica con paginación y acciones:

```typescript
<DataTable
  columns={[
    { id: 'email', label: 'Email' },
    { id: 'createdAt', label: 'Creado', format: formatDate },
  ]}
  rows={users}
  onPageChange={handlePageChange}
  actions={(row) => (
    <IconButton onClick={() => handleEdit(row)}>
      <EditIcon />
    </IconButton>
  )}
/>
```

#### ConfirmDialog
Modal de confirmación:

```typescript
<ConfirmDialog
  open={openDelete}
  title="Eliminar Usuario"
  message="¿Estás seguro?"
  onConfirm={handleDelete}
  onCancel={() => setOpenDelete(false)}
  severity="error"
/>
```

#### PageHeader
Header con titulo y breadcrumbs:

```typescript
<PageHeader
  title="Usuarios"
  subtitle="Gestiona los usuarios"
  breadcrumbs={[
    { label: 'Home', path: '/' },
    { label: 'Usuarios' },
  ]}
  action={<Button>Crear</Button>}
/>
```

### Componentes de Layout

#### MainLayout
Layout principal con sidebar y topbar:

```typescript
<MainLayout>
  {children}
</MainLayout>
```

- Responsivo (sidebar se convierte en drawer en móvil)
- Menú dinámico basado en permisos
- Información del usuario en topbar

#### AuthLayout
Layout para páginas de autenticación:

```typescript
<AuthLayout>
  <LoginForm />
</AuthLayout>
```

---

## Formularios y Validación

### React Hook Form + Zod

Ejemplo completo:

```typescript
// 1. Definir esquema Zod
const userSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().optional(),
  roleId: z.string().min(1, 'Rol requerido'),
});

// 2. Usar en formulario
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(userSchema),
  defaultValues: initialData,
});

// 3. Renderizar campos
<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      error={!!errors.email}
      helperText={errors.email?.message}
    />
  )}
/>
```

**Ventajas:**
- Validación del lado del cliente antes de enviar
- Mensajes de error claros
- TypeScript infiere tipos automáticamente

---

## Interceptores y Manejo de Errores

### Request Interceptor

```typescript
axiosInstance.interceptors.request.use((config) => {
  // Agregar token
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptor

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Manejar 401 (token expirado)
    if (error.response?.status === 401) {
      try {
        // Intentar refrescar token
        await useAuthStore.getState().refreshAccessToken();
        // Reintentar solicitud
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Si falla refresh, logout
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
```

### Try-Catch en Componentes

```typescript
const handleSubmit = async (data) => {
  try {
    await createUserMutation.mutateAsync(data);
    enqueueSnackbar('Usuario creado', { variant: 'success' });
    navigate('/users');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    enqueueSnackbar(message, { variant: 'error' });
  }
};
```

---

## React Query Integration

### Configuración

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Hooks Personalizados

```typescript
export const useUsers = () => {
  const queryClient = useQueryClient();

  // Query
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  // Mutation con invalidación
  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // o con optimistic update
      // queryClient.setQueryData(['users'], old => [...old, newUser])
    },
  });

  return { usersQuery, createMutation };
};
```

### Uso en Componentes

```typescript
const { usersQuery, createMutation } = useUsers();

// Lectura
if (usersQuery.isLoading) return <LoadingSpinner />;
const users = usersQuery.data || [];

// Escritura
const handleCreate = async (data) => {
  await createMutation.mutateAsync(data);
};
```

---

## TypeScript

### Tipos Globales

Todos los tipos están centralizados en `src/types/`:

```typescript
// auth.types.ts
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// user.types.ts, role.types.ts, permission.types.ts...
```

### Configuración Estricta

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Beneficios:**
- Detecta errores en tiempo de compilación
- Mejor autocompletar en IDE
- Código más mantenible

---

## Performance

### Optimizaciones Implementadas

1. **Code Splitting**
   - Lazy loading de páginas con React.lazy()
   - Suspense boundaries

2. **Memoization**
   ```typescript
   const MemoizedComponent = React.memo(ExpensiveComponent);
   ```

3. **React Query Caching**
   - Datos en caché por 5 minutos
   - Evita refetch innecesarios

4. **Vite Bundling**
   - Tree-shaking automático
   - CSS scope automático

### Monitoreo

Para verificar performance:
```bash
npm run build
# Ver tamaño de bundle
npm run preview
```

---

## Flujo de Autenticación

```
1. Usuario escribe email/contraseña
2. LoginForm -> LoginPage -> useAuth -> authApi.login()
3. Backend retorna accessToken + refreshToken
4. AuthStore almacena tokens
5. Axios interceptor agrega token en requests
6. Si 401: intenta refresh automáticamente
7. Si refresh falla: logout automático
```

---

## Patrones Reusables

### Hook para Query + Mutations

```typescript
export const useResource = () => {
  const queryClient = useQueryClient();

  const resourceQuery = useQuery({
    queryKey: ['resources'],
    queryFn: () => api.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  return { resourceQuery, createMutation };
};
```

### Componente Tabla + Form

```typescript
// Listar
<ResourceTable
  resources={data}
  onDelete={handleDelete}
  canEdit={hasPermission('edit')}
/>

// Crear/Editar
<ResourceForm
  onSubmit={handleSubmit}
  initialData={editingResource}
  isEdit={!!editingResource}
/>
```

---

## Testing (Recomendación)

Para futuro, se pueden agregar tests con:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Ejemplo de test:

```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
```

---

## Conclusión

El frontend está diseñado con:
- ✅ Separación de responsabilidades
- ✅ Reutilización de componentes
- ✅ Type safety con TypeScript
- ✅ Performance optimizado
- ✅ UX profesional
- ✅ Manejo robusto de errores
- ✅ Escalabilidad para futuras features

Para más detalles, consulta el código fuente en `frontend/src/`.
