-- ¿Aplica IVA (19%) al registro DTF? Se traslada a la OP al convertir.
ALTER TABLE "dtf_records" ADD COLUMN IF NOT EXISTS "apply_iva" BOOLEAN NOT NULL DEFAULT false;
