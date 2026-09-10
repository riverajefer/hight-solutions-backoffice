-- Corrige el nombre de la columna del descuento de órdenes en `payroll_items`.
--
-- La migración anterior la creó como `order_deductions`, siguiendo la
-- convención snake_case del resto del esquema. Pero `payroll_items` es una de
-- las tablas que quedaron en camelCase: sus columnas son `periodId`,
-- `baseSalary`, `employeeFundSavings`… sin ningún `@map` en el modelo.
--
-- El modelo declara `orderDeductions` sin `@map`, así que Prisma buscaba una
-- columna con ese nombre exacto y no la encontraba. El síntoma no fue un error
-- claro sino un 500 en TODA consulta a `payroll_items` —incluido el listado del
-- periodo y la generación de registros— con el mensaje inútil
-- "The column `(not available)` does not exist in the current database".
--
-- Migración idempotente: dev y staging comparten la misma base de datos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_items' AND column_name = 'order_deductions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_items' AND column_name = 'orderDeductions'
  ) THEN
    ALTER TABLE "payroll_items" RENAME COLUMN "order_deductions" TO "orderDeductions";
  END IF;
END
$$;

-- Red de seguridad para una base que nunca tuvo ninguna de las dos.
ALTER TABLE "payroll_items"
  ADD COLUMN IF NOT EXISTS "orderDeductions" DECIMAL(12, 2);
