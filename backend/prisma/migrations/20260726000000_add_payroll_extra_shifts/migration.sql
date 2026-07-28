-- CreateTable
CREATE TABLE IF NOT EXISTS "payroll_extra_shifts" (
  "id"            TEXT NOT NULL,
  "payrollItemId" TEXT NOT NULL,
  "shiftDate"     DATE NOT NULL,
  "description"   TEXT,
  "amount"        DECIMAL(12,2) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payroll_extra_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_extra_shifts_payrollItemId_idx"
  ON "payroll_extra_shifts"("payrollItemId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "payroll_extra_shifts"
    ADD CONSTRAINT "payroll_extra_shifts_payrollItemId_fkey"
    FOREIGN KEY ("payrollItemId") REFERENCES "payroll_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
