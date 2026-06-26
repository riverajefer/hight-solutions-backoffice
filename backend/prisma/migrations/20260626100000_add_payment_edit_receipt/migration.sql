-- Comprobante propuesto en la edición de pago (payload pendiente).
-- Migración idempotente: dev y staging comparten la misma DB.

ALTER TABLE "payment_edit_approvals"
  ADD COLUMN IF NOT EXISTS "old_receipt_file_id" TEXT;

ALTER TABLE "payment_edit_approvals"
  ADD COLUMN IF NOT EXISTS "new_receipt_file_id" TEXT;
