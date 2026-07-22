-- Método de pago y notas del abono (paridad con abono inicial de OP)
ALTER TABLE "dtf_records" ADD COLUMN IF NOT EXISTS "abono_payment_method" "PaymentMethod";
ALTER TABLE "dtf_records" ADD COLUMN IF NOT EXISTS "abono_notes" TEXT;
