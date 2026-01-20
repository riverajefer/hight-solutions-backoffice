# Configuración del Registro de Auditoría (@explita/prisma-audit-log)

## Descripción General

Se ha instalado y configurado el plugin `@explita/prisma-audit-log` para proporcionar registro automático de auditoría en todas las operaciones de base de datos (crear, actualizar, eliminar).

## Componentes Instalados

### 1. Paquete NPM
- **Paquete**: `@explita/prisma-audit-log`
- **Versión**: 0.2.1
- **Instalación**: `npm install @explita/prisma-audit-log`

### 2. Modelo de Base de Datos

Se agregó el modelo `AuditLog` a `prisma/schema.prisma`:

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String?  @map("user_id")
  recordId      String   @map("record_id")
  action        String
  model         String
  oldData       Json?    @map("old_data")
  newData       Json?    @map("new_data")
  changedFields Json?    @map("changed_fields")
  ipAddress     String?  @map("ip_address")
  userAgent     String?  @map("user_agent")
  metadata      Json?
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}
```

**Campos:**
- `id`: Identificador único del registro de auditoría
- `userId`: ID del usuario que realizó la operación (si existe)
- `recordId`: ID del registro afectado
- `action`: Tipo de operación (create, update, delete)
- `model`: Nombre del modelo que fue modificado
- `oldData`: Datos anteriores (para updates)
- `newData`: Datos nuevos
- `changedFields`: Campos que fueron modificados (como JSON)
- `ipAddress`: Dirección IP del cliente
- `userAgent`: User-Agent del navegador/cliente
- `metadata`: Metadatos adicionales en formato JSON
- `createdAt`: Timestamp del registro

### 3. Configuración de Auditoría

#### a. `src/common/utils/audit-context.ts`

Utilidades para manejar el contexto de auditoría:
- `getAuditContext()`: Obtiene el contexto actual
- `setAuditContextFromRequest()`: Establece el contexto desde una solicitud HTTP
- `clearAuditContext()`: Limpia el contexto después de completar una solicitud

#### b. `src/common/interceptors/audit-context.interceptor.ts`

Interceptor global que:
- Captura información de la solicitud HTTP (IP, User-Agent, ID del usuario)
- Establece el contexto de auditoría al inicio de cada solicitud
- Limpia el contexto al finalizar la solicitud

#### c. `src/database/prisma.service.ts`

Servicio de Prisma actualizado con:
- Extensión de auditoría aplicada mediante `$extends()`
- Enmascaramiento de campos sensibles: `password`, `refreshToken`
- Exclusión de campos sensibles del registro: campos de User
- Configuración para evitar registrar cambios en el modelo AuditLog

### 4. Integración en Módulo Principal

El `AuditContextInterceptor` se registró globalmente en `src/app.module.ts` usando `APP_INTERCEPTOR`.

## Características Configuradas

✅ **Registro automático** de operaciones create, update y delete  
✅ **Enmascaramiento** de campos sensibles (password, tokens)  
✅ **Captura de contexto**: Usuario, IP, User-Agent  
✅ **Registro de cambios**: Qué campos fueron modificados  
✅ **Datos antes/después**: Comparación de datos para auditoría  
✅ **Exclusión inteligente**: No registra cambios de solo `updatedAt`  
✅ **Soporte para operaciones batch**: Procesa múltiples operaciones

## Campos Enmascarados

Los siguientes campos NO aparecerán en los registros de auditoría:
- `password` (User)
- `refreshToken` (User)

Se reemplazan con: `[REDACTED]`

## Uso en la Aplicación

Las operaciones se registran automáticamente. Ejemplos:

```typescript
// Crear un usuario (se registra automáticamente)
await this.prisma.user.create({
  data: {
    email: 'user@example.com',
    password: 'hashed_password',
    roleId: 'role-id',
  },
});

// Actualizar un usuario (se registra automáticamente)
await this.prisma.user.update({
  where: { id: 'user-id' },
  data: { email: 'newemail@example.com' },
});

// Eliminar un usuario (se registra automáticamente)
await this.prisma.user.delete({
  where: { id: 'user-id' },
});
```

### Consultar Registros de Auditoría

```typescript
// Obtener todos los registros de auditoría de un usuario
const auditLogs = await this.prisma.auditLog.findMany({
  where: { userId: 'user-id' },
  orderBy: { createdAt: 'desc' },
});

// Obtener cambios en un modelo específico
const userChanges = await this.prisma.auditLog.findMany({
  where: { model: 'User' },
  orderBy: { createdAt: 'desc' },
});

// Obtener cambios en un registro específico
const recordChanges = await this.prisma.auditLog.findMany({
  where: { 
    recordId: 'specific-record-id',
    model: 'User',
  },
  orderBy: { createdAt: 'desc' },
});
```

## Ejemplo de Registro de Auditoría

Cuando un usuario actualiza su email, se genera un registro como:

```json
{
  "id": "clzxx1234...",
  "userId": "user-123",
  "recordId": "user-456",
  "action": "update",
  "model": "User",
  "oldData": {
    "email": "oldemail@example.com",
    "password": "[REDACTED]"
  },
  "newData": {
    "email": "newemail@example.com",
    "password": "[REDACTED]"
  },
  "changedFields": ["email"],
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "userAgent": "Mozilla/5.0..."
  },
  "createdAt": "2026-01-17T10:30:00Z"
}
```

## Configuración Personalizada

Para modificar el comportamiento de la auditoría, edita `src/database/prisma.service.ts`:

```typescript
auditLogExtension({
  // Incluir solo modelos específicos
  includeModels: ['User', 'Role'], // Opcional

  // Excluir modelos específicos
  excludeModels: ['Session'], // Opcional

  // Campos a enmascarar
  maskFields: ['password', 'refreshToken'],

  // Filtros por modelo (incluir/excluir campos)
  fieldFilters: {
    User: {
      exclude: ['password', 'refreshToken'], // No registrar estos campos
    },
  },

  // Truncar valores largos
  maxStringLength: 1000,
  maxArrayLength: 50,

  // Logger personalizado
  logger: (log) => {
    // Enviar a servicio de logging
    console.log('AUDIT:', log);
  },

  // Saltar registro para operaciones específicas
  skip: ({ model, operation, args }) => {
    if (model === 'AuditLog') return true;
    return false;
  },
})
```

## Notas Importantes

1. **Contexto de Usuario**: El ID del usuario se obtiene de `request.user.id`. Asegúrate de que la autenticación establece este valor correctamente.

2. **Base de Datos SQLite**: Como se usa SQLite, los campos de array se almacenan como JSON.

3. **Rendimiento**: La auditoría se procesa automáticamente, pero el volumen de registros puede crecer significativamente. Considera implementar políticas de retención.

4. **Sensibilidad**: Los campos enmascarados no se pueden recuperar de los registros de auditoría por seguridad.

5. **Migración**: Se creó la tabla `audit_logs` con la migración `add_audit_log`.

## Próximos Pasos (Opcional)

1. **Crear un servicio de AuditLog**: Desarrollar un módulo específico para consultas y análisis de auditoría
2. **API de Auditoría**: Exponer endpoints para consultar registros de auditoría
3. **Política de Retención**: Implementar limpieza automática de registros antiguos
4. **Dashboard de Auditoría**: Crear interfaz visual para revisar logs
5. **Alertas**: Configurar notificaciones para operaciones críticas

## Troubleshooting

### El contexto de usuario es `undefined`

Verifica que:
- El middleware de autenticación se ejecute antes del interceptor de auditoría
- `request.user.id` se establece correctamente en la autenticación

### Los registros de auditoría no se crean

Verifica:
- La tabla `audit_logs` existe en la base de datos
- El servicio de Prisma está usando la extensión correctamente
- No hay errores en los logs de la aplicación

### Campos sensibles se están registrando

Agrega los campos a `maskFields` y/o `fieldFilters` en la configuración de la extensión.
