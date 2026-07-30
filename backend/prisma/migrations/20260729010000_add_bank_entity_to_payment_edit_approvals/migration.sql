-- Snapshot de la entidad bancaria en el flujo de aprobación de edición de pagos.
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "payment_edit_approvals" ADD COLUMN IF NOT EXISTS "old_bank_entity" TEXT;
ALTER TABLE "payment_edit_approvals" ADD COLUMN IF NOT EXISTS "new_bank_entity" TEXT;
