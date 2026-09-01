-- La solicitud de anulación ahora puede apuntar a un pago, no solo a un
-- movimiento de caja, y se separa el permiso de "pedir" del de "ejecutar".
--
-- 1. `cash_movement_id` pasa a ser opcional y se agrega `payment_id`.
--
--    Un tercio de los pagos recientes en producción (588 de los últimos 60 días)
--    no tiene movimiento de caja: se registran fuera del horario de caja o salen
--    de saldo a favor. Si la solicitud solo pudiera colgar de un movimiento, el
--    comercial no podría pedir la anulación justo de esos.
--
-- 2. `request_payment_void` separa pedir de ejecutar.
--
--    Hasta ahora `void_cash_movements` era todo o nada: quien lo tenía anulaba
--    de una si la caja estaba abierta. Dárselo a los 12 comerciales habría
--    significado que pueden quitar plata de una orden sin que nadie autorice.
--    Con el permiso nuevo el comercial SIEMPRE pasa por el admin, sin importar
--    el estado de la caja; `void_cash_movements` sigue siendo el que ejecuta sin
--    aprobación y no cambia de manos.
--
--    Se asigna a Comercial, Comercial Líder y a los tres roles que ya podían
--    anular (el endpoint pide este permiso a todos; el otro solo decide si la
--    anulación es directa o queda en solicitud).
--
-- Migración idempotente. Dev y staging comparten la misma base de datos.

-- ── 1. Objetivo de la solicitud ──────────────────────────────────────────────

ALTER TABLE "cash_movement_void_requests"
  ALTER COLUMN "cash_movement_id" DROP NOT NULL;

ALTER TABLE "cash_movement_void_requests"
  ADD COLUMN IF NOT EXISTS "payment_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_movement_void_requests_payment_id_fkey'
  ) THEN
    ALTER TABLE "cash_movement_void_requests"
      ADD CONSTRAINT "cash_movement_void_requests_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "cash_movement_void_requests_payment_id_idx"
  ON "cash_movement_void_requests"("payment_id");

-- Una solicitud sin objetivo no se puede resolver: no habría qué anular.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_movement_void_requests_target_check'
  ) THEN
    ALTER TABLE "cash_movement_void_requests"
      ADD CONSTRAINT "cash_movement_void_requests_target_check"
      CHECK ("cash_movement_id" IS NOT NULL OR "payment_id" IS NOT NULL);
  END IF;
END $$;

-- ── 2. Permiso para solicitar ────────────────────────────────────────────────

INSERT INTO "permissions" ("id", "name", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       'request_payment_void',
       'Solicitar anulación de pagos de una orden',
       NOW(),
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" WHERE "name" = 'request_payment_void'
);

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", NOW()
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."name" = 'request_payment_void'
  AND r."name" IN ('admin', 'caja', 'contabilidad', 'Comercial', 'Comercial Lider')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
