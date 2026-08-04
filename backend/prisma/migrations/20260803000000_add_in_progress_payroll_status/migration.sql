-- Nuevo estado "IN_PROGRESS" (En curso) para periodos de nómina, para
-- identificar el periodo activo al que se vinculan los anticipos.
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TYPE "PayrollPeriodStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
