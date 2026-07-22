-- Abono / anticipo del cliente asociado al registro DTF
ALTER TABLE "dtf_records" ADD COLUMN IF NOT EXISTS "abono" DECIMAL(12,2) NOT NULL DEFAULT 0;
