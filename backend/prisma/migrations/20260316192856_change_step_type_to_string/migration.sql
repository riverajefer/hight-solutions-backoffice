-- Convert StepType enum column to TEXT, preserving existing values
-- (PAPEL, PLANCHAS, etc. are stored as their string representations in Postgres enums)

-- AlterTable: cast enum -> TEXT using explicit cast
ALTER TABLE "step_definitions" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- DropEnum (no longer needed)
DROP TYPE IF EXISTS "StepType";

-- CreateIndex (unique constraint already existed; ensure it is present)
CREATE UNIQUE INDEX IF NOT EXISTS "step_definitions_type_key" ON "step_definitions"("type");
