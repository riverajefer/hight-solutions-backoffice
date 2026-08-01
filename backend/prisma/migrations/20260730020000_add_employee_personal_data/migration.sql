-- Agrega los datos personales/RRHH del empleado (identificación, nombres,
-- contacto, seguridad social y contacto de emergencia). Todos opcionales.
-- Idempotente: dev y staging comparten la misma base de datos.

-- Enums nuevos
DO $$ BEGIN
  CREATE TYPE "IdentificationType" AS ENUM ('CC', 'CE', 'TI', 'PA', 'NIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columnas nuevas en employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "identificationType" "IdentificationType";
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "identificationNumber" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "documentIssueDate" TIMESTAMP(3);

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "middleName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "firstLastName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "secondLastName" TEXT;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "sex" "Sex";
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "eps" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pensionFund" TEXT;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyContactRelationship" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
