-- Nuevo tipo de identificación "PPT" (Permiso por Protección Temporal) para
-- empleados de nómina.
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TYPE "IdentificationType" ADD VALUE IF NOT EXISTS 'PPT';
