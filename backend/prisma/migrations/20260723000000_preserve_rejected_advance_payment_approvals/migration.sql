-- Conserva la solicitud de anticipo cuando el pago es eliminado por un rechazo.
--
-- Antes: advance_payment_approvals.payment_id era NOT NULL con ON DELETE CASCADE,
-- así que al rechazar (que elimina el pago) la solicitud desaparecía y se perdía
-- el rastro de quién rechazó, cuándo y por qué.
--
-- Ahora: payment_id es nullable con ON DELETE SET NULL, y se guarda un snapshot
-- del monto y método del pago para que el historial siga siendo legible.
--
-- Idempotente: se puede ejecutar varias veces sin efecto adicional.

ALTER TABLE "advance_payment_approvals"
  ALTER COLUMN "payment_id" DROP NOT NULL;

ALTER TABLE "advance_payment_approvals"
  ADD COLUMN IF NOT EXISTS "payment_amount" DECIMAL(65,30);

ALTER TABLE "advance_payment_approvals"
  ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod";

ALTER TABLE "advance_payment_approvals"
  DROP CONSTRAINT IF EXISTS "advance_payment_approvals_payment_id_fkey";

ALTER TABLE "advance_payment_approvals"
  ADD CONSTRAINT "advance_payment_approvals_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill del snapshot para las solicitudes cuyo pago todavía existe.
UPDATE "advance_payment_approvals" a
SET "payment_amount" = p."amount",
    "payment_method" = p."payment_method"
FROM "payments" p
WHERE a."payment_id" = p."id"
  AND a."payment_amount" IS NULL;
