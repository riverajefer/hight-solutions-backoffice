-- Devoluciones que sobreviven al recálculo de totales.
--
-- La aprobación de una devolución resta el monto a `orders.paid_amount`, pero no
-- borra los `payments`. Como `recalculateOrderTotals()` recalcula `paid_amount`
-- como la suma de los pagos, bastaba con editar un ítem de la OP para que el
-- dinero ya devuelto en efectivo reapareciera como saldo a favor disponible
-- (y pudiera volver a gastarse o a devolverse).
--
-- `refunded_amount` guarda cuánto se devolvió, para que el recálculo sea
-- idempotente:  paid_amount = suma(pagos) - refunded_amount
--
-- El valor histórico se concilia con `npm run prisma:backfill:refunded-amount`,
-- que no altera los saldos: sólo hace explícito el descuento que ya estaba
-- aplicado sobre `paid_amount`.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "refunded_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;
