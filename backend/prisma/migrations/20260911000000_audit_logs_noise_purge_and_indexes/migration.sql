-- Depuración de `audit_logs` e índices para leerla.
--
-- Al 2026-09-10, en PRD, `audit_logs` pesaba 290 MB de los 358 MB de la base
-- (~540 000 filas) y cerca del 84 % era ruido:
--
--   - `ActivityHeartbeat`: 344 000 filas (64 %). Un CREATE por cada heartbeat
--     (~2 min por usuario conectado) y un DELETE por cada uno que borra el cron
--     nocturno de asistencia.
--   - `User` UPDATE con `changed_fields = ["updatedAt"]`: 60 000 filas (11 %). Era
--     la rotación del refreshToken: `fieldFilters` quita ese campo del log, pero lo
--     hacía después de decidir que el cambio merecía uno, y quedaba un log vacío.
--   - `Notification`, `WhatsappActionContext` y `SessionLog`: 52 000 filas. Son
--     tablas que ya son un registro en sí mismas; el log solo duplicaba cada fila.
--
-- Desde este cambio `withAuditLog` ya no los genera (`UNAUDITED_MODELS` en
-- prisma.service.ts e `isAuditable` en audit-log.extension.ts). Aquí se borra lo
-- acumulado.
--
-- Índices: la tabla solo tenía la PK. El historial de la OP
-- (GET /audit-logs/record/:recordId) la recorría entera cada vez que alguien abría
-- la pestaña (624 ms en PRD y creciendo), el listado ordena por `created_at` y la
-- purga por retención filtra por `model` + `created_at`.
--
-- El DELETE no devuelve el espacio al disco: Postgres lo reutiliza para las filas
-- nuevas. Para devolverlo hay que correr a mano, de noche,
-- `VACUUM (FULL, ANALYZE) audit_logs;`, que bloquea la tabla unos segundos y no
-- puede ir dentro de una migración.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

DELETE FROM "audit_logs"
WHERE "model" IN ('ActivityHeartbeat', 'Notification', 'WhatsappActionContext', 'SessionLog');

DELETE FROM "audit_logs"
WHERE "model" = 'User'
  AND "action" = 'UPDATE'
  AND "changed_fields" = '["updatedAt"]'::jsonb;

CREATE INDEX IF NOT EXISTS "audit_logs_record_id_idx" ON "audit_logs"("record_id");
CREATE INDEX IF NOT EXISTS "audit_logs_model_created_at_idx" ON "audit_logs"("model", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
