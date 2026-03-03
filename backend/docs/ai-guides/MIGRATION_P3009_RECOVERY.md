# Recovery Guide: Prisma P3009 en Staging

## Contexto

Este documento cubre la recuperación del error:

```
P3009: migrate found failed migrations in the target database
```

Caso observado:

```
20260227013507_remove_returned_status_enforce_flow
```

## Objetivo

- Recuperar staging sin resetear base de datos.
- Reconciliar el estado real de la base con el historial de Prisma.
- Volver a habilitar `prisma migrate deploy`.

## 0) Precondiciones obligatorias

1. Tomar backup de la base de staging antes de ejecutar cambios.
2. Confirmar que `DATABASE_URL` apunta a staging (no producción).
3. Ejecutar estos pasos desde `backend/`.

## 1) Diagnóstico inicial

```bash
npm run prisma:migrate:status
```

Inspeccionar en SQL el registro de la migración fallida:

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
FROM "_prisma_migrations"
WHERE migration_name = '20260227013507_remove_returned_status_enforce_flow';
```

## 2) Reparar estado parcial de la migración

Ejecutar este script SQL en la base de staging:

`prisma/manual-recovery/20260227013507_p3009_staging_recovery.sql`

Qué hace:

- Migra datos `RETURNED -> WARRANTY`.
- Repara estados parciales de enum `OrderStatus` / `OrderStatus_old`.
- Re-castea columnas afectadas a `OrderStatus` final.
- Elimina `OrderStatus_old` si existe.

## 3) Reconciliar historial de Prisma

Si el script dejó la migración aplicada en BD, marcarla como aplicada:

```bash
MIGRATION_NAME=20260227013507_remove_returned_status_enforce_flow npm run prisma:migrate:resolve:applied
```

Si se revierte manualmente al estado anterior para reintentar la migración, marcar como rollback:

```bash
MIGRATION_NAME=20260227013507_remove_returned_status_enforce_flow npm run prisma:migrate:resolve:rolledback
```

## 4) Continuar deploy de migraciones

```bash
npm run prisma:migrate:prod
```

## 5) Validación final

```bash
npm run prisma:migrate:status
```

Validaciones esperadas:

- Sin migraciones en estado failed.
- Sin `RETURNED` en tablas relacionadas.
- Tipo final `OrderStatus` sin valor `RETURNED`.

Checks SQL sugeridos:

```sql
SELECT DISTINCT status::text FROM orders ORDER BY 1;
SELECT DISTINCT current_status::text FROM order_status_change_requests ORDER BY 1;
SELECT DISTINCT requested_status::text FROM order_status_change_requests ORDER BY 1;
SELECT DISTINCT order_status::text FROM editable_order_statuses ORDER BY 1;
```

## Notas importantes

- No editar migraciones históricas ya desplegadas.
- No usar `migrate reset` en staging/producción.
- Si este incidente se repite, revisar primero drift manual de esquema y ejecución parcial en deploy.