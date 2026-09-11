# Registro de Auditoría (`withAuditLog`)

## Descripción General

Toda escritura por Prisma (crear, actualizar, eliminar) deja un registro en `audit_logs`
de forma automática. Lo hace una extensión propia, `withAuditLog`
(`src/database/audit-log.extension.ts`), que reemplazó a `@explita/prisma-audit-log` 0.2.1
el 2026-09-10.

### Por qué se reemplazó la librería

La librería hacía la pre-lectura y el `auditLog.createMany` con el cliente base, **fuera**
de la transacción interactiva:

- Cada transacción que tocaba un modelo auditado pedía una segunda conexión al pool sin
  soltar la suya. Con tantas transacciones concurrentes como conexiones tiene el pool
  (3 por defecto), se bloqueaban hasta el timeout de 45 s → 500 y rollback.
- Los logs sobrevivían al rollback: `audit_logs` registraba operaciones que nunca ocurrieron.

El formato de los registros no cambió (mismas `action`, mismos snapshots), así que los
logs anteriores y posteriores se leen igual.

## Componentes

### 1. Modelo de Base de Datos

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
- `userId`: usuario que hizo la operación (del contexto del request, ver abajo)
- `recordId`: id del registro afectado. En modelos con llave compuesta es `llave1:llave2`
  (p. ej. `orderItemId:productionAreaId`); `'unknown'` solo si no se pudo resolver
- `action`: en mayúsculas — `CREATE`, `UPDATE`, `DELETE`, `CREATE_upsert`, `UPDATE_upsert`
- `model`: nombre del modelo de Prisma (`Order`, `Payment`...)
- `oldData` / `newData`: en `UPDATE`, solo los campos que cambiaron; en `CREATE`, la fila
  creada; en `DELETE`, la fila eliminada
- `changedFields`: lista de campos modificados (solo `UPDATE`)
- `ipAddress`, `metadata.userAgent`: del request
- `createdAt`: momento en que se escribió el log

### 2. Contexto del request (`src/common/utils/audit-context.ts`)

El contexto vive en `AsyncLocalStorage`, así que los requests concurrentes no se pisan:

- `buildAuditContextFromRequest(req)`: arma IP y User-Agent desde el request
- `runWithAuditContext(context, fn)`: ejecuta `fn` con ese contexto
- `setAuditUserId(userId)`: agrega el usuario cuando ya pasó la autenticación
- `getAuditContext()`: lo lee `withAuditLog` al construir cada log

Cableado en `src/app.module.ts`:
- `AuditContextMiddleware` (`src/common/middleware/`) abre el contexto al inicio del request
- `AuditContextInterceptor` (`src/common/interceptors/`, registrado con `APP_INTERCEPTOR`)
  agrega el `userId` después del guard de JWT

### 3. Extensiones de Prisma (`src/database/`)

- `audit-log.extension.ts` — `withAuditLog(client, options)`: el hook de auditoría y el
  envoltorio de `$transaction`
- `audit-record-id.extension.ts` — `auditRecordIdExtension`: completa el `recordId` de los
  modelos con llave compuesta (`COMPOSITE_PRIMARY_KEYS`). Va **debajo** de `withAuditLog`
  porque este escribe los logs con el cliente que recibe
- `prisma.service.ts` — los compone:

```typescript
const extended = withAuditLog(this.$extends(auditRecordIdExtension), {
  getContext: () => { /* userId, ipAddress, metadata.userAgent */ },
  maskFields: ['password', 'refreshToken'],
  maskValue: '[REDACTED]',
  fieldFilters: { User: { exclude: ['password', 'refreshToken'] } },
  logger: (logs) => { /* solo en development */ },
  skip: ({ model }) => UNAUDITED_MODELS.has(model),
});
```

## Qué se audita

- Operaciones: `create`, `createMany`, `createManyAndReturn`, `delete`, `deleteMany`,
  `update`, `updateMany`, `updateManyAndReturn`, `upsert`. Las lecturas no.
- `UNAUDITED_MODELS` (en `prisma.service.ts`) no se audita:
  - `AuditLog` y `Consecutive` (operación crítica de concurrencia);
  - `ActivityHeartbeat`, `Notification`, `WhatsappActionContext` y `SessionLog`: ya son un
    registro en sí mismas y el log solo duplicaba cada fila. Al 2026-09-10 eran el ~75 % de
    `audit_logs` en PRD (los heartbeats solos, el 64 %).
  Antes de auditar una tabla nueva de alta frecuencia (heartbeats, colas, contextos
  técnicos), agrégala aquí.
- Un `UPDATE` en el que solo cambió `updatedAt` no deja log. Tampoco uno cuyos cambios
  reales quedaron todos fuera por `fieldFilters` (`isAuditable`): la rotación del
  `refreshToken` de `User` generaba un log con solo `["updatedAt"]` en cada login/refresh.
- `createMany` no devuelve filas: el log sale de los datos de entrada, así que si el id lo
  genera la base queda `'unknown'`. Usa `createManyAndReturn` si necesitas el id en el log.

## Transacciones

| Caso | Pre-lectura | Escritura del log |
|------|-------------|-------------------|
| Operación suelta | cliente base | inmediata |
| `$transaction(async (tx) => ...)` | cliente `tx` (misma conexión) | en un solo `createMany`, **después del commit** |
| `$transaction(async ...)` con rollback | cliente `tx` | se descarta: no queda log |
| `$transaction([...])` (por lotes) | cliente base | inmediata, como una operación suelta |

Consecuencias:

- Una transacción auditada ya no pide una segunda conexión: N transacciones concurrentes
  caben en un pool de cualquier tamaño (esperan su turno, no se bloquean entre sí).
- Si el proceso muere justo entre el commit y la escritura del log, ese log se pierde. Es
  el costo elegido: preferimos un dato sin log a un log sin dato.
- Un fallo al escribir el log se registra con el `Logger` de Nest (contexto `AuditLog`) y
  **no** se propaga: la operación de negocio ya está hecha.
- Los logs aparecen en `audit_logs` un instante después del commit, no durante la
  transacción: no los consultes dentro de la misma `tx` esperando verlos.

### Dependencia de APIs internas de Prisma

`withAuditLog` reconoce la transacción con `params.__internalParams.transaction` (en el hook)
y `tx[Symbol.for('prisma.client.transaction.id')]` (en el cliente `tx`). No son API pública.
`audit-log.extension.spec.ts` corre el runtime real de Prisma con un driver adapter falso,
así que un upgrade de Prisma que las rompa hace fallar los tests. Corre `npx jest src/database`
después de cada upgrade de `prisma` / `@prisma/client`.

## Retención

`AuditLogsScheduler` corre todos los días a las 3:30 AM (hora Colombia) y borra los logs de
`AUDIT_RETENTION_MODELS` con más de `AUDIT_RETENTION_MONTHS` (3) meses. Ambas constantes
están en `audit-logs.service.ts`.

- Solo entran modelos operativos: `DtfRecord`, `DtfStatusHistory`, `ProductionOrder*`,
  `Prospect`, `ProspectContact`.
- Todo lo demás se conserva sin límite: dinero, órdenes, clientes, permisos, aprobaciones,
  comprobantes (`UploadedFile`) y asistencia (alimenta la nómina). Un modelo que no esté en
  la lista no se purga nunca; el spec del servicio falla si se agrega uno de dinero u órdenes.
- Con réplicas el cron corre una vez por réplica; el borrado es idempotente.

La depuración inicial (heartbeats, notificaciones y los `User` UPDATE vacíos) la hizo la
migración `20260911000000_audit_logs_noise_purge_and_indexes`. El `DELETE` no devuelve el
espacio al disco, Postgres lo reutiliza. Para devolverlo, a mano y de noche (bloquea la
tabla unos segundos):

```sql
VACUUM (FULL, ANALYZE) audit_logs;
```

## Consultar Registros de Auditoría

Índices: `record_id`, `(model, created_at)` y `created_at`. Filtra por esas columnas; una
búsqueda dentro de `old_data`/`new_data` sin acotar por `model` recorre la tabla entera.

```typescript
const recordChanges = await this.prisma.auditLog.findMany({
  where: {
    model: 'Order',
    recordId: 'specific-record-id',
    createdAt: { gte: desde },
  },
  orderBy: { createdAt: 'desc' },
});
```

Además de los logs automáticos, `AuditLogsService.logOrderChange` escribe logs manuales de
órdenes. En el frontend se ven en `features/audit-logs` y en la pestaña de historial de la OP
(`OrderChangeHistoryTab`), que interpreta `CREATE`/`UPDATE`/`DELETE`.

## Ejemplo de Registro

```json
{
  "id": "clzxx1234...",
  "userId": "user-123",
  "recordId": "user-456",
  "action": "UPDATE",
  "model": "User",
  "oldData": { "email": "oldemail@example.com" },
  "newData": { "email": "newemail@example.com" },
  "changedFields": ["email"],
  "ipAddress": "192.168.1.100",
  "metadata": { "userAgent": "Mozilla/5.0..." },
  "createdAt": "2026-09-10T10:30:00Z"
}
```

`password` y `refreshToken` de `User` se excluyen por `fieldFilters`; en cualquier otro
modelo o en `metadata`, `maskFields` los reemplaza por `[REDACTED]` a cualquier profundidad.

## Opciones de `withAuditLog`

| Opción | Uso |
|--------|-----|
| `getContext` | Campos extra del log (`userId`, `ipAddress`, `metadata`) |
| `maskFields` / `maskValue` | Claves a enmascarar en `oldData`/`newData`/`metadata` |
| `fieldFilters` | `include`/`exclude` de campos por modelo |
| `logger` | Se llama con el array de logs ya guardados |
| `skip` | `({ model, operation, args }) => boolean` para no auditar |

Las opciones de la librería que no se usaban (`maskPaths`, `maxStringLength`,
`maxArrayLength`, `maxPayloadBytes`, `includeModels`, `excludeModels`) no existen aquí.

## Troubleshooting

### Error 500 "Transaction already closed" / timeout de transacción bajo carga
Antes de este cambio, la causa típica era la auditoría ahogando el pool. Si reaparece,
revisa el tamaño del pool (`connection_limit` en `DATABASE_URL`, 3 por defecto) y si alguna
consulta dentro de una `tx` usa `this.prisma` en vez de `tx`.

### `userId` vacío en los logs
El log se escribió fuera de un request (cron, script) o antes de que el
`AuditContextInterceptor` agregara el usuario. Los logs anteriores al 2026-09-10 no son
confiables para atribuir acciones a una persona (el contexto era una variable global).

### `recordId = 'unknown'`
`createMany` con ids generados por la base, o un modelo con `@@id([...])` nuevo que no se
registró en `COMPOSITE_PRIMARY_KEYS` (el spec de `audit-record-id.extension` lo detecta).
