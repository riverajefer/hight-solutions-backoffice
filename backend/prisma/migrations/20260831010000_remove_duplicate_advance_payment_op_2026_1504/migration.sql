-- Eliminar el pago duplicado de $1 que quedó en OP-2026-1504 y devolver la
-- orden y la caja a lo que realmente pasó.
--
-- El cliente pagó $7.000 UNA vez. El asesor registró ese mismo pago tres veces:
--
--   14:35  $7.000  sin soporte      → duplicado, es el que se corrige acá
--   14:53  $7.000  con soporte      → aprobado por Caja a las 17:19, es el bueno
--   16:08  $7.000  sin soporte      → rechazado por Caja, ya anulado el 14/08
--
-- El 31/08 alguien intentó destrabar la orden a mano editando el primero de
-- $7.000 a $1, sobre una sesión de caja cerrada el 5 de agosto. Eso no arregló
-- el bloqueo (lo arregla la migración anterior) y dejó dos cosas mal:
--
--   - `paid_amount` 7.001 contra un total de 7.000, con saldo de -$1, es decir
--     un saldo a favor inventado que el cliente podría llegar a reclamar.
--   - $1 de ingreso en la caja del 3 de agosto que nunca entró.
--
-- Se elimina el pago en vez de dejarlo en $0 porque $0 está reservado para los
-- pagos a CRÉDITO, que no son dinero pero sí son un hecho comercial. Este pago
-- no es ninguna de las dos cosas: nunca existió. La solicitud de aprobación
-- 75fceaac sobrevive como rastro de auditoría (ON DELETE SET NULL), igual que
-- con cualquier anticipo rechazado.
--
-- El movimiento de caja se anula ANTES de borrar el pago: la FK vive en Payment,
-- así que al borrarlo se pierde el vínculo y el ingreso sobreviviría contando en
-- el arqueo. Se anula administrativamente, sin contramovimiento y sin reabrir la
-- sesión, siguiendo el mismo criterio del saneamiento del 14/08: ese dinero
-- nunca debió entrar, no es un egreso que haya que registrar. La sesión
-- 49054f38 queda con $6.999 menos de ingreso en TRANSFER; el efectivo contado
-- al cierre no cambia.
--
-- Migración idempotente: los tres pasos están guardados por el estado que
-- esperan encontrar, y en cualquier base donde estos IDs no existan es un no-op.

-- 1. Anular el movimiento de caja del pago duplicado.
UPDATE "cash_movements"
SET
  "is_voided" = true,
  "voided_at" = NOW(),
  "void_reason" = 'Saneamiento: pago duplicado de OP-2026-1504 (el mismo pago se registró tres veces)'
WHERE "id" = '694ad4bb-0816-41e5-bfdb-da2558b6d39f'
  AND "is_voided" = false;

-- 2. Eliminar el pago duplicado.
DELETE FROM "payments"
WHERE "id" = 'ab2da5c5-f751-4378-8b10-d4b941ce2e5e';

-- 3. Recalcular la orden desde los pagos que sobreviven.
--    paid_amount = suma(pagos) - refunded_amount
--    balance     = total - paid_amount + applied_credit_amount
UPDATE "orders" o
SET
  "paid_amount" = sub."paid",
  "balance" = o."total" - sub."paid" + o."applied_credit_amount"
FROM (
  SELECT
    GREATEST(
      COALESCE((
        SELECT SUM(p."amount")
        FROM "payments" p
        WHERE p."order_id" = '9509b29e-b57f-4738-a338-4550a925003d'
      ), 0) - (
        SELECT "refunded_amount"
        FROM "orders"
        WHERE "id" = '9509b29e-b57f-4738-a338-4550a925003d'
      ),
      0
    ) AS "paid"
) sub
WHERE o."id" = '9509b29e-b57f-4738-a338-4550a925003d'
  AND o."paid_amount" IS DISTINCT FROM sub."paid";
