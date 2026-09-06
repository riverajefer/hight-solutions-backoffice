-- Doble clic en "Crear OG" quema dos consecutivos.
--
-- El formulario de OG crea con `onClick={handleCreate}`, no con el submit de
-- React Hook Form, así que `disabled={isSubmitting}` no bloquea nada: el botón
-- solo se deshabilita en el siguiente render y dos clics en el mismo frame
-- disparan dos POST. En producción esto creó OG-2026-0485 y OG-2026-0486 con
-- 34 ms de diferencia (mismo usuario, mismo producto, $600.000 cada una), y
-- antes OG-2026-0446. Peor todavía: la segunda petición perdió la carrera al
-- generar el consecutivo de la Cuenta por Pagar, así que la 0486 quedó sin CxP.
--
-- La guardia de cliente no es autoritativa. `idempotency_key` la genera el
-- formulario una vez al montarse y viaja en las dos peticiones; el índice único
-- hace que la segunda choque contra la base de datos y el servicio devuelva la
-- OG que ya existe, sin gastar otro consecutivo.
--
-- Migración idempotente. Dev y staging comparten la misma base de datos.

ALTER TABLE "expense_orders"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

-- Único, pero NULL no colisiona con NULL en Postgres: las OGs históricas (y
-- cualquier cliente viejo que no mande la llave) siguen entrando sin problema.
CREATE UNIQUE INDEX IF NOT EXISTS "expense_orders_idempotency_key_key"
  ON "expense_orders" ("idempotency_key");
