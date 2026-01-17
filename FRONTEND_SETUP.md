# Guía de Inicio Rápido - Hight Solutions Backoffice

## Requisitos

- Node.js 16+
- Backend corriendo en `http://localhost:3000`

## Instalación y Ejecución Rápida

### 1. Instalar dependencias del Frontend

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

Las variables ya están configuradas en `frontend/.env`, pero puedes ajustarlas si es necesario:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Hight Solutions Backoffice
```

### 3. Iniciar el Frontend

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

## Usuarios de Prueba

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@example.com | admin123 | admin |
| manager@example.com | manager123 | manager |
| user@example.com | user123 | user |

## Características Principales

✅ **Autenticación**: Login y refresh token automático
✅ **RBAC**: Control de acceso basado en roles y permisos
✅ **Usuarios**: CRUD completo con validación
✅ **Roles**: Gestión de roles con asignación de permisos
✅ **Permisos**: Listado y gestión de permisos
✅ **Dashboard**: Panel con estadísticas
✅ **Responsive**: Diseño adaptable a dispositivos móviles
✅ **Notificaciones**: Feedback visual con Snackbar
✅ **TypeScript Estricto**: Todo tipado correctamente

## Estructura del Frontend

```
frontend/
├── src/
│   ├── api/              # Servicios HTTP
│   ├── components/       # Componentes reutilizables
│   ├── features/         # Módulos por funcionalidad
│   ├── hooks/            # Custom hooks
│   ├── store/            # Zustand stores
│   ├── types/            # Tipos TypeScript
│   ├── utils/            # Utilidades
│   ├── theme/            # Tema de Material UI
│   ├── router/           # Configuración de rutas
│   └── App.tsx           # Punto de entrada
```

## Stack Tecnológico

- **React 18+** con **Vite**
- **TypeScript** estricto
- **Material UI v5+** para diseño
- **Zustand** para estado global
- **React Router DOM v6+** para navegación
- **Axios** para HTTP
- **React Query** para cache de datos
- **React Hook Form + Zod** para formularios
- **notistack** para notificaciones

## Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## Documentación Completa

Para más detalles sobre la arquitectura, componentes y funcionalidades, ver [README del Frontend](./frontend/README.md)

## Solución de Problemas

### Puerto 5173 ya en uso
```bash
npm run dev -- --port 3001
```

### CORS Error
Asegúrate de que el backend tiene CORS habilitado para `http://localhost:5173`

### Errores de dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**¡El frontend está listo para usar!** 🚀
