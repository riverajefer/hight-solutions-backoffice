-- Cola de abonos pendientes de ingresar a caja.
--
-- Un abono registrado sin sesión de caja abierta quedaba con `cash_movement_id`
-- NULL para siempre y nunca aparecía en el arqueo. Ahora se marca como
-- pendiente y entra automáticamente al abrirse la próxima sesión.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "pending_cash_entry" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "payments_pending_cash_entry_idx"
  ON "payments"("pending_cash_entry");
