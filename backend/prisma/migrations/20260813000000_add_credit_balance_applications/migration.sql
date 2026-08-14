-- Consumo trazable del saldo a favor del cliente.
--
-- Antes, un pago con método CREDIT_BALANCE solo registraba una etiqueta: la OP de
-- origen conservaba su balance negativo, así que el mismo excedente podía aplicarse
-- infinitas veces (y además seguía disponible para devolución en efectivo).
--
-- `applied_credit_amount` guarda cuánto del excedente de una OP ya se consumió en
-- otras OPs, y `credit_balance_applications` deja la trazabilidad pago ↔ OP origen
-- para poder revertir la aplicación si el pago se elimina o se edita.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "applied_credit_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "credit_balance_applications" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "source_order_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_balance_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "credit_balance_applications_payment_id_idx"
  ON "credit_balance_applications"("payment_id");
CREATE INDEX IF NOT EXISTS "credit_balance_applications_source_order_id_idx"
  ON "credit_balance_applications"("source_order_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_balance_applications_payment_id_fkey'
  ) THEN
    ALTER TABLE "credit_balance_applications"
      ADD CONSTRAINT "credit_balance_applications_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_balance_applications_source_order_id_fkey'
  ) THEN
    ALTER TABLE "credit_balance_applications"
      ADD CONSTRAINT "credit_balance_applications_source_order_id_fkey"
      FOREIGN KEY ("source_order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
