-- Devoluciones para toda OP, no solo para las que tienen saldo a favor.
--
-- Hasta hoy "devolución" significaba una sola cosa: devolverle al cliente un
-- excedente que pagó de más. Esa plata nunca fue una venta, así que bastaba con
-- bajar `paid_amount`. El cliente pidió habilitarla también cuando el trabajo no
-- cumple (el UV salió con mala resolución, se fue la luz, se retrasó la entrega),
-- y ese caso es distinto: ahí lo que se deshace es la venta.
--
-- Procesar el segundo caso con la lógica del primero deja la OP debiendo la plata
-- que se acaba de devolver, porque `balance = total - paid_amount`. Esa deuda
-- fantasma entra a la cartera por cobrar del dashboard y alguien sale a cobrarle
-- a un cliente al que ya se le devolvió el dinero.
--
-- La solución es separar las dos cifras que estaban colapsadas en una:
--
--   refund_amount   → dinero que sale de la caja      (tope: lo abonado)
--   reversed_amount → valor de la venta que se anula  (tope: el total)
--
-- No son iguales. Una OP de $500.000 con $200.000 abonados que se cae entera
-- anula $500.000 de venta y devuelve $200.000 de dinero. Con una sola cifra ese
-- caso es irrepresentable.
--
-- El balance pasa a ser `(total - reversed_amount) - paid_amount + applied_credit`,
-- y la devolución de saldo a favor sigue siendo el mismo flujo con
-- `reversed_amount = 0`.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

-- 1. Motivo tipificado de la devolución.
--    Sin esto la única explicación es la observación en texto libre, que no se
--    puede agrupar ni reportar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundReason') THEN
    CREATE TYPE "RefundReason" AS ENUM (
      'CREDIT_BALANCE',
      'QUALITY',
      'DELIVERY_DELAY',
      'FORCE_MAJEURE',
      'CLIENT_WITHDRAWAL',
      'OTHER'
    );
  END IF;
END
$$;

-- 2. Venta anulada acumulada por OP.
--    `reversed_net_amount` es la misma anulación en la moneda de la comisión
--    (`subtotal - discount_amount`, sin IVA ni el redondeo comercial del total).
--    Se guarda calculada porque la base comisionable se arma con un `_sum` en un
--    `groupBy` de Prisma, que no sabe prorratear.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "reversed_amount" DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reversed_net_amount" DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- 3. La solicitud registra cuánta venta anula y por qué.
--    El default `CREDIT_BALANCE` deja a las solicitudes históricas donde estaban:
--    todas fueron devoluciones de saldo a favor, que es lo único que el sistema
--    permitía hasta ahora.
ALTER TABLE "refund_requests"
  ADD COLUMN IF NOT EXISTS "reversed_amount" DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "refund_reason" "RefundReason" NOT NULL DEFAULT 'CREDIT_BALANCE',
  ADD COLUMN IF NOT EXISTS "executed_by_id" TEXT;

-- 4. Quién pagó la devolución.
--    Gerencia autoriza y Caja paga, así que el revisor y el ejecutor ya no son
--    necesariamente la misma persona.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_executed_by_id_fkey'
  ) THEN
    ALTER TABLE "refund_requests"
      ADD CONSTRAINT "refund_requests_executed_by_id_fkey"
      FOREIGN KEY ("executed_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "refund_requests_executed_by_id_idx"
  ON "refund_requests" ("executed_by_id");

-- 5. Bandeja de "autorizadas pendientes de pago".
--    Es la consulta que Caja hace cada vez que abre el panel: aprobadas sin
--    ejecutar. Sin el índice recorre toda la tabla.
CREATE INDEX IF NOT EXISTS "refund_requests_pending_execution_idx"
  ON "refund_requests" ("status")
  WHERE "executed_at" IS NULL;

-- 6. Las solicitudes ya aprobadas antes de esta migración se pagaron en el mismo
--    acto de aprobarlas (el modelo anterior no separaba las dos cosas). Se les
--    marca la ejecución con su propia fecha de revisión para que no aparezcan en
--    la bandeja nueva pidiendo un pago que ya se hizo.
UPDATE "refund_requests"
SET "executed_at" = COALESCE("executed_at", "reviewed_at"),
    "executed_by_id" = COALESCE("executed_by_id", "reviewed_by_id")
WHERE "status" = 'APPROVED'
  AND "executed_at" IS NULL;
