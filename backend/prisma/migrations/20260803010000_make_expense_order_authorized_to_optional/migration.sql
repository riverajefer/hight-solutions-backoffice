-- El campo "Se autoriza a" (empleado) de la Orden de Gasto ahora es opcional.
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "expense_orders" ALTER COLUMN "authorized_to_id" DROP NOT NULL;
