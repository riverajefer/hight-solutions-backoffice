-- Descuento de ahorro al fondo de empleados en la nómina.
--
-- El empleado autoriza que cada quincena se le retenga un monto fijo para su
-- ahorro en el fondo de empleados. Hasta ahora ese descuento no tenía campo
-- propio: se metía dentro de "Préstamos" o se restaba a mano del total, así que
-- el desprendible no lo mostraba y nadie podía sacar cuánto había que girarle
-- al fondo por periodo.
--
-- Es opcional y arranca en NULL: los registros de nómina existentes no cambian
-- de total.
--
-- Idempotente: IF NOT EXISTS. Dev y staging comparten base.

ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employeeFundSavings" DECIMAL(12,2);
