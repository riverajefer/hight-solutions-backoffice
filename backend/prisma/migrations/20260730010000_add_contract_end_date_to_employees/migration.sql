-- Agrega la fecha de terminación de contrato del empleado (opcional).
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP(3);
