# 🚀 GUÍA COMPLETA - EJECUCIÓN DEL SISTEMA COMPLETO

## High Solutions Backoffice - Frontend + Backend

### Requisitos Previos

- **Node.js**: 16+ instalado
- **npm**: 8+ instalado
- **Git**: Para control de versiones

---

## 📋 Paso 1: Preparar el Entorno

### Estructura del Proyecto

```
hight-solutions-backoffice/
├── backend/                    # Backend NestJS + Prisma
├── frontend/                   # Frontend React + Vite
├── docs/                       # Documentación
├── package.json               # (raíz)
└── README.md                  # README principal
```

---

## 🔧 Paso 2: Configurar el Backend

> ℹ️ Si el backend ya está configurado, puedes saltarte esta sección.

### Instalar Dependencias del Backend

```bash
# Desde la raíz del proyecto
npm install
```

O desde el directorio del backend:

```bash
# cd a la raíz del proyecto (si no estás ahí)
cd /Users/jeffersonrivera/dev/Hight-Solutions/hight-solutions-backoffice

npm install
```

### Configurar Base de Datos

```bash
# Correr migraciones
npm run migrate

# (Opcional) Seed de datos de prueba
npm run seed
```

### Iniciar Backend

```bash
npm run start
```

El backend estará disponible en: **http://localhost:3000**

✅ Deberías ver logs indicando que el servidor está escuchando en el puerto 3000.

---

## ⚛️ Paso 3: Configurar el Frontend

### Instalar Dependencias del Frontend

```bash
# Navegar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install
```

### Verificar Variables de Entorno

El archivo `.env` ya está configurado correctamente:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=High Solutions Backoffice
```

Si necesitas cambiar algo:

```bash
# Editar .env
nano .env
```

### Iniciar Frontend

```bash
# Desde la carpeta frontend
npm run dev
```

El frontend se abrirá automáticamente en: **http://localhost:5173**

---

## 🎯 Método 1: Ejecutar Frontend y Backend en 2 Terminales (Recomendado)

### Terminal 1: Backend

```bash
# Desde la raíz del proyecto
cd /Users/jeffersonrivera/dev/Hight-Solutions/hight-solutions-backoffice

npm run start
```

**Espera a ver**: `NestApplication successfully started`

### Terminal 2: Frontend

```bash
# Desde la carpeta frontend
cd /Users/jeffersonrivera/dev/Hight-Solutions/hight-solutions-backoffice/frontend

npm run dev
```

**Espera a ver**: El navegador se abre automáticamente en `http://localhost:5173`

---

## 🎯 Método 2: Ejecutar Ambos en Una Sola Terminal (Script)

Desde la raíz del proyecto:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Este script:
1. Inicia el backend en background
2. Espera a que esté listo
3. Inicia el frontend
4. Muestra información útil
5. Presiona Ctrl+C para detener ambos

---

## 🔐 Paso 4: Acceder al Sistema

### Usuarios de Prueba

| Email | Contraseña | Rol | Permisos |
|-------|------------|-----|----------|
| **admin@example.com** | admin123 | Admin | Todos los permisos |
| **manager@example.com** | manager123 | Manager | Crear/leer/actualizar usuarios, leer roles |
| **user@example.com** | user123 | User | Leer usuarios y roles |

### Cómo Acceder

1. Abre **http://localhost:5173** en tu navegador
2. Verás la página de login
3. Ingresa uno de los usuarios de prueba
4. ¡Bienvenido al backoffice!

---

## ✨ Funcionalidades Disponibles

### 📊 Dashboard
- Estadísticas de usuarios, roles y permisos
- Accesos rápidos a las secciones principales

### 👥 Gestión de Usuarios
- Listar usuarios
- Crear nuevo usuario
- Editar usuario
- Eliminar usuario (con confirmación)
- Asignar roles

### 🔐 Gestión de Roles
- Listar roles
- Crear nuevo rol
- Editar rol
- Asignar/remover permisos
- Eliminar rol (con confirmación)

### 🔑 Gestión de Permisos
- Listar permisos
- Ver qué roles tienen cada permiso
- Crear permisos (solo admin)
- Eliminar permisos (solo admin)

---

## 🧪 Testear Funcionalidades

### Probar Control de Acceso

1. **Con Admin** (admin@example.com):
   - Puedes acceder a todas las secciones
   - Puedes crear, editar y eliminar todo

2. **Con Manager** (manager@example.com):
   - Puedes ver usuarios y roles
   - Puedes crear y editar usuarios
   - NO puedes ver permisos
   - NO puedes editar roles

3. **Con User** (user@example.com):
   - Solo puedes leer información
   - NO puedes crear ni editar nada
   - NO puedes ver permisos ni roles

### Verificar Refresh Token

1. Abre DevTools (F12)
2. Ve a Application → Local Storage
3. Verifica que hay:
   - `auth-storage` (con tokens y usuario)
4. Espera 1 hora (o borra el token para simular expiración)
5. Intenta hacer una acción
6. El token debería refrescarse automáticamente

### Verificar CRUD de Usuarios

```bash
# Crear usuario
1. Dashboard → Crear Usuario
2. Completa el formulario
3. Selecciona un rol
4. Presiona "Crear Usuario"

# Editar usuario
1. Usuarios → click en tabla
2. Modifica datos
3. Presiona "Actualizar"

# Eliminar usuario
1. Usuarios → click en ícono de eliminar
2. Confirma en el diálogo
```

---

## 📱 Probar Responsive Design

### En navegadores modernos (Chrome, Firefox, Edge):

1. Abre DevTools (F12)
2. Click en "Toggle device toolbar" (Ctrl+Shift+M)
3. Selecciona diferentes dispositivos:
   - iPhone 12
   - iPad
   - Pixel 5
   - etc.

El sidebar se convierte en drawer automáticamente en móvil.

---

## 🔍 Verificar Conexión API

### Desde DevTools (Network tab):

1. Abre DevTools → Network
2. Realiza una acción (ej: cargar usuarios)
3. Verifica que:
   - Las peticiones van a `http://localhost:3000/api/v1`
   - Los status codes son 200 (éxito)
   - Los tokens se envían en headers

### Headers esperados:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚨 Solución de Problemas

### Frontend no carga

```bash
# Opción 1: Limpiar cache
rm -rf node_modules package-lock.json
npm install
npm run dev

# Opción 2: Cambiar puerto
npm run dev -- --port 3001
```

### Backend no responde

```bash
# Verificar que está corriendo
curl http://localhost:3000/api/v1/health

# Si no funciona, reiniciar
# (Detén con Ctrl+C y ejecuta npm run start de nuevo)
```

### Error CORS

```bash
# En el backend (ya debería estar configurado)
# Pero si no, verifica que CORS esté habilitado para:
# http://localhost:5173
```

### Token expirado / Logout forzado

```bash
# Solución 1: Limpiar localStorage
# DevTools → Application → Local Storage → Clear All

# Solución 2: Hacer login de nuevo
# El sistema debería manejar esto automáticamente
```

### Usuarios de prueba no existen

```bash
# Correr seed nuevamente
npm run seed

# O hacer login con admin y crear usuarios manualmente
```

---

## 📊 Comandos Útiles

### Backend

```bash
# Iniciar en desarrollo
npm run start

# Iniciar en modo watch
npm run start:dev

# Build para producción
npm run build

# Ejecutar migraciones
npm run migrate

# Seed de datos
npm run seed
```

### Frontend

```bash
# Iniciar dev server
npm run dev

# Build para producción
npm run build

# Previsualizar build
npm run preview

# Linting
npm run lint
```

---

## 📚 Documentación Adicional

Para más detalles, consulta:

1. **[FRONTEND_SETUP.md](./FRONTEND_SETUP.md)** - Guía de instalación del frontend
2. **[FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)** - Arquitectura técnica
3. **[frontend/README.md](./frontend/README.md)** - README completo del frontend
4. **[README.md](./README.md)** - README principal del proyecto
5. **[docs/](./docs/)** - Documentación del backend

---

## ✅ Checklist Final

- [ ] Backend instalado y corriendo en http://localhost:3000
- [ ] Frontend instalado y corriendo en http://localhost:5173
- [ ] Base de datos configurada y migraciones ejecutadas
- [ ] Usuarios de prueba creados (o seed ejecutado)
- [ ] Puedo hacer login con admin@example.com
- [ ] Puedo ver usuarios, roles y permisos
- [ ] Puedo crear un nuevo usuario
- [ ] Puedo editar un usuario
- [ ] Puedo eliminar un usuario (con confirmación)
- [ ] Puedo ver que el token se envía en las peticiones
- [ ] Responsive design funciona en móvil
- [ ] Notificaciones (toasts) funcionan

---

## 🎉 ¡Sistema Completo Listo!

### Próximos Pasos

1. **Desarrollar nuevas funcionalidades** siguiendo la estructura
2. **Agregar más módulos** (Productos, Órdenes, etc.)
3. **Desplegar a producción** (Vercel para frontend, Render para backend)
4. **Agregar tests** (Jest, Vitest)
5. **Configurar CI/CD** (GitHub Actions)

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica que Node.js y npm estén instalados correctamente
2. Asegúrate de tener los puertos 3000 y 5173 disponibles
3. Limpia node_modules y reinstala si hay conflictos
4. Revisa los logs de error (consola y DevTools)
5. Consulta la documentación en la carpeta `docs/`

---

**¡Disfruta desarrollando! 🚀**
