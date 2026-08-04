-- Vincula un anticipo (Cuenta por Pagar tipo "Personal" / subcategoría "Anticipos")
-- con el usuario beneficiario y el periodo de nómina en curso, para reflejar el
-- descuento en la nómina.
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "beneficiary_user_id" TEXT;
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "payroll_period_id" TEXT;

CREATE INDEX IF NOT EXISTS "accounts_payable_beneficiary_user_id_idx" ON "accounts_payable"("beneficiary_user_id");
CREATE INDEX IF NOT EXISTS "accounts_payable_payroll_period_id_idx" ON "accounts_payable"("payroll_period_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_payable_beneficiary_user_id_fkey'
  ) THEN
    ALTER TABLE "accounts_payable"
      ADD CONSTRAINT "accounts_payable_beneficiary_user_id_fkey"
      FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_payable_payroll_period_id_fkey'
  ) THEN
    ALTER TABLE "accounts_payable"
      ADD CONSTRAINT "accounts_payable_payroll_period_id_fkey"
      FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
