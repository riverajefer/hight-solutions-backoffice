-- Retenciones en Órdenes de Gasto y Cuentas por Pagar.
--
-- Hasta ahora solo la OP podía registrar retenciones. Del lado del gasto la
-- empresa también le practica retefuente/ReteICA/ReteIVA al proveedor, y sin
-- estos campos la OG y la CxP quedaban por el valor bruto: se le pagaba de más
-- o alguien ajustaba el monto a mano sin dejar rastro de la base retenida.
--
-- `subtotal_amount` guarda la base gravable de la CxP. Antes se reconstruía
-- dividiendo `total_amount / (1 + iva_rate)`, cuenta que deja de cuadrar en
-- cuanto hay retenciones.
--
-- Idempotente: IF NOT EXISTS en cada columna. Dev y staging comparten base.

ALTER TABLE "expense_orders" ADD COLUMN IF NOT EXISTS "retefuente_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "expense_orders" ADD COLUMN IF NOT EXISTS "rete_ica_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "expense_orders" ADD COLUMN IF NOT EXISTS "rete_iva_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "retefuente_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "rete_ica_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "rete_iva_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill de la base de las cuentas existentes: ninguna tiene retenciones
-- todavía, así que la base es el total sin IVA.
UPDATE "accounts_payable"
SET "subtotal_amount" = ROUND(
  CASE
    WHEN "apply_iva" AND "iva_rate" > 0 THEN "total_amount" / (1 + "iva_rate")
    ELSE "total_amount"
  END,
  2
)
WHERE "subtotal_amount" = 0;
