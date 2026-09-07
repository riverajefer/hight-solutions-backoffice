-- Llave de idempotencia para órdenes de pedido y pagos.
--
-- Mismo problema que ya se resolvió en órdenes de gasto
-- (`20260906000000_expense_order_idempotency_key`): un doble clic manda dos
-- POST idénticos y se crean dos registros. En OP y en abonos duele más, porque
-- lo que se duplica es dinero:
--
--   * Una OP duplicada quema un consecutivo y deja al cliente con dos pedidos
--     que alguien tiene que anular a mano.
--   * Un abono duplicado infla `paidAmount` y el arqueo de caja: la orden
--     aparece pagada de más y nace un saldo a favor que nadie recibió.
--
-- La guarda del cliente (`useSingleFlight`) no es autoritativa: no cubre el
-- reintento de red, ni dos pestañas, ni un cliente viejo en caché. La llave la
-- genera el formulario y viaja en las dos peticiones; el índice único hace que
-- la segunda choque contra la base y el servicio devuelva el registro que ya
-- existe, sin gastar otro consecutivo ni mover la caja otra vez.
--
-- NULL no colisiona con NULL en Postgres, así que las filas históricas y
-- cualquier cliente que no mande la llave siguen entrando sin problema.
--
-- Migración idempotente. Dev y staging comparten la misma base de datos.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key"
  ON "orders" ("idempotency_key");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key"
  ON "payments" ("idempotency_key");
