-- Motivo y fecha de rechazo de la cotización (obligatorio al pasar a REJECTED).
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
