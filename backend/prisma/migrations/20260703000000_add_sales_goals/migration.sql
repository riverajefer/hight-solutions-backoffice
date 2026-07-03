-- Metas de ventas por asesor (SalesGoal)
-- Migración idempotente: dev y staging comparten la misma DB.

-- Tabla sales_goals
CREATE TABLE IF NOT EXISTS "sales_goals" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sales_goals_pkey" PRIMARY KEY ("id")
);

-- Índice único (advisor_id, month, year)
CREATE UNIQUE INDEX IF NOT EXISTS "sales_goals_advisor_id_month_year_key" ON "sales_goals"("advisor_id", "month", "year");

-- Foreign key hacia users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_goals_advisor_id_fkey'
  ) THEN
    ALTER TABLE "sales_goals"
      ADD CONSTRAINT "sales_goals_advisor_id_fkey"
      FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
