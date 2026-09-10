-- Descuento por nómina: empleados que mandan a hacer trabajos en la empresa y
-- piden que el valor se les reste del pago de la quincena en vez de pagarlo en
-- caja.
--
-- Hasta hoy no había forma de expresarlo. El asesor marcaba la OP como
-- "Crédito" y el cobro quedaba por fuera del sistema: nadie sabía a qué empleado
-- había que descontarle, ni cuánto, ni si ya se había hecho.
--
-- El modelo tiene tres piezas, y las tres importan:
--
--   1. `clients.employee_id` — hoy no existe NINGÚN vínculo entre un cliente y
--      un empleado: `Employee` cuelga de `User` y `Client` es una tabla aparte.
--      Sin este puente el sistema no puede saber a quién descontarle. Se hace
--      explícito y no por cruce de cédula: el documento no es llave de identidad
--      en esta base (hay clientes duplicados y cédulas vacías).
--
--   2. `payroll_deductions` — la cuenta por cobrar al empleado. Es lo que une la
--      OP con el `payroll_item` donde termina descontándose.
--
--   3. `payroll_items.order_deductions` — el renglón del descuento en la nómina,
--      separado de `loans` y `advances` para poder auditar de dónde salió cada
--      peso restado.
--
-- Decisión central: la OP NO nace pagada. Al crearla se registra un pago de $0
-- (igual que el crédito) y esta fila en PENDING; el pago con el monto real
-- —sin movimiento de caja— solo se crea cuando el descuento se aplica sobre la
-- nómina. Registrarlo antes daría por cobrado dinero que la empresa todavía no
-- ha recuperado, que es exactamente el problema que ya se corrigió con CREDIT.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

-- 1. Estados del descuento.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayrollDeductionStatus') THEN
    CREATE TYPE "PayrollDeductionStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'APPLIED',
      'CANCELLED'
    );
  END IF;
END
$$;

-- 2. El cliente que además es empleado.
--    `UNIQUE` para que dos fichas de cliente no puedan apuntar al mismo empleado
--    y terminen descontándole dos veces por trabajos distintos sin que nadie lo
--    note.
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "employee_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_employee_id_fkey'
  ) THEN
    ALTER TABLE "clients"
      ADD CONSTRAINT "clients_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_employee_id_key"
  ON "clients" ("employee_id");

-- 3. El renglón del descuento en la nómina.
--    Nulo, no 0 por defecto: distingue "este periodo no tuvo descuentos" de
--    "todavía nadie lo ha calculado", igual que el resto de conceptos.
ALTER TABLE "payroll_items"
  ADD COLUMN IF NOT EXISTS "order_deductions" DECIMAL(12, 2);

-- 4. La cuenta por cobrar al empleado.
CREATE TABLE IF NOT EXISTS "payroll_deductions" (
  "id"               TEXT NOT NULL,
  "order_id"         TEXT NOT NULL,
  "employee_id"      TEXT NOT NULL,
  "payroll_item_id"  TEXT,
  "payment_id"       TEXT,
  "amount"           DECIMAL(12, 2) NOT NULL,
  "status"           "PayrollDeductionStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by_id"  TEXT NOT NULL,
  "approved_by_id"   TEXT,
  "approved_at"      TIMESTAMP(3),
  "rejection_reason" TEXT,
  "applied_by_id"    TEXT,
  "applied_at"       TIMESTAMP(3),
  "cancelled_at"     TIMESTAMP(3),
  "cancel_reason"    TEXT,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- 5. Las dos defensas reales contra el doble descuento.
--    Una OP se descuenta una sola vez, y un descuento genera un solo abono. El
--    `findFirst` del servicio no alcanza: dos clics separados por milisegundos
--    pasan los dos por la verificación antes de que ninguno escriba.
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_deductions_order_id_key"
  ON "payroll_deductions" ("order_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_deductions_payment_id_key"
  ON "payroll_deductions" ("payment_id");

CREATE INDEX IF NOT EXISTS "payroll_deductions_employee_id_idx"
  ON "payroll_deductions" ("employee_id");

CREATE INDEX IF NOT EXISTS "payroll_deductions_payroll_item_id_idx"
  ON "payroll_deductions" ("payroll_item_id");

-- Bandeja de pendientes por aprobar y de aprobados por aplicar: es la consulta
-- que nómina hace al abrir el módulo.
CREATE INDEX IF NOT EXISTS "payroll_deductions_status_idx"
  ON "payroll_deductions" ("status");

-- 6. Llaves foráneas.
--    La OP se borra en cascada (el descuento no tiene sentido sin ella); el
--    empleado y los usuarios se restringen para no perder el rastro de auditoría.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_order_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_employee_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_payroll_item_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_payroll_item_id_fkey"
      FOREIGN KEY ("payroll_item_id") REFERENCES "payroll_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_payment_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_requested_by_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_approved_by_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_deductions_applied_by_id_fkey') THEN
    ALTER TABLE "payroll_deductions"
      ADD CONSTRAINT "payroll_deductions_applied_by_id_fkey"
      FOREIGN KEY ("applied_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
