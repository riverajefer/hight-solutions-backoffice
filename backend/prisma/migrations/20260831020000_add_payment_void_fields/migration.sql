-- Anulación de pagos individuales.
--
-- Hasta ahora anular un movimiento de caja BORRABA el pago vinculado. El dinero
-- quedaba bien, pero el Historial de Pagos de la orden perdía la fila y nadie
-- podía ver qué había pasado ni quién lo autorizó: la pantalla mentía por
-- omisión. Ahora el pago sobrevive marcado como anulado y deja de sumar a
-- `paid_amount`.
--
-- Idempotente: IF NOT EXISTS en cada columna. Dev y staging comparten base.

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "is_voided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "voided_by_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "void_reason" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_voided_by_id_fkey'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_voided_by_id_fkey"
      FOREIGN KEY ("voided_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Los pagos vivos hoy no están anulados: el default cubre el backfill.
CREATE INDEX IF NOT EXISTS "payments_order_id_is_voided_idx" ON "payments"("order_id", "is_voided");
