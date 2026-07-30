-- Agrega la entidad bancaria de origen (solo aplica a pagos por transferencia).
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "bank_entity" TEXT;
ALTER TABLE "expense_order_items" ADD COLUMN IF NOT EXISTS "bank_entity" TEXT;
ALTER TABLE "account_payable_payments" ADD COLUMN IF NOT EXISTS "bank_entity" TEXT;
ALTER TABLE "dtf_records" ADD COLUMN IF NOT EXISTS "abono_bank_entity" TEXT;
ALTER TABLE "refund_requests" ADD COLUMN IF NOT EXISTS "bank_entity" TEXT;
