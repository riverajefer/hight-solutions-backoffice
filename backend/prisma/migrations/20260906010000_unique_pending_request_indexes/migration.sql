-- Una sola solicitud PENDIENTE por entidad, garantizada por la base de datos.
--
-- Todos los módulos de solicitudes validan con un `findFirst` ("¿ya hay una
-- pendiente?") y después insertan. Dos peticiones concurrentes leen las dos
-- "no hay pendiente" antes de que cualquiera inserte, y ambas crean su fila:
-- una sola acción del usuario termina generando dos solicitudes idénticas y,
-- por lo tanto, dos notificaciones de WhatsApp. La solicitud que no se aprueba
-- se queda PENDING para siempre en "Solicitudes Pendientes".
--
-- Esto ya se corrigió para órdenes de gasto en
-- `20260828000000_unique_pending_expense_order_auth_request`, con tres casos
-- reales de producción documentados (OG-2026-0444, 0445 y 0317, con 1 a 14 ms
-- entre las filas gemelas). Esta migración aplica el mismo patrón a las nueve
-- tablas de solicitudes restantes.
--
-- El predicado de cada índice replica exactamente el `where` del `findFirst`
-- del servicio: si el guard de la aplicación permite dos filas, el índice
-- también, y viceversa. No se está endureciendo ninguna regla de negocio, solo
-- moviendo la garantía a donde la carrera no existe.
--
-- `account_payable_payment_reversal_requests` no aparece aquí: ya está cubierta
-- por el UNIQUE global de `payment_auth_request_id` (una reversión por pago).
--
-- Migración idempotente: dev y staging comparten la misma base de datos.
--
-- Los duplicados que ya existan se resuelven conservando la solicitud más
-- antigua de cada grupo y marcando las demás como EXPIRED: nadie las revisó,
-- así que REJECTED daría a entender que un administrador las negó.
-- Al 2026-09-06 producción no tiene ninguno; los UPDATE son la red para dev,
-- staging y cualquier base sembrada a futuro.

-- ---------------------------------------------------------------------------
-- 1. client_advisor_requests — un asesor propuesto por cliente
--    Guard: client-advisor-requests.service.ts (clientId + requestedAdvisorId)
-- ---------------------------------------------------------------------------
UPDATE "client_advisor_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "client_advisor_requests" o
    WHERE o."client_id" = r."client_id"
      AND o."requested_advisor_id" = r."requested_advisor_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "client_advisor_requests_pending_unique"
  ON "client_advisor_requests" ("client_id", "requested_advisor_id")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 2. order_edit_requests — una solicitud de edición por orden y usuario
--    Guard: order-edit-requests.service.ts (orderId + requestedById)
-- ---------------------------------------------------------------------------
UPDATE "order_edit_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "order_edit_requests" o
    WHERE o."order_id" = r."order_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "order_edit_requests_pending_unique"
  ON "order_edit_requests" ("order_id", "requested_by_id")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 3. order_status_change_requests — por orden, usuario y estado solicitado
--    Guard: order-status-change-requests.service.ts
--    (el estado destino entra en la llave: pedir "Entregada" y "Anulada" a la
--    vez es válido según el guard actual)
-- ---------------------------------------------------------------------------
UPDATE "order_status_change_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "order_status_change_requests" o
    WHERE o."order_id" = r."order_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."requested_status" = r."requested_status"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "order_status_change_requests_pending_unique"
  ON "order_status_change_requests" ("order_id", "requested_by_id", "requested_status")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 4. advisor_change_requests — una por orden, sin importar quién la pide
--    Guard: advisor-change-requests.service.ts (solo orderId)
-- ---------------------------------------------------------------------------
UPDATE "advisor_change_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "advisor_change_requests" o
    WHERE o."order_id" = r."order_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "advisor_change_requests_pending_unique"
  ON "advisor_change_requests" ("order_id")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 5. account_payable_auth_requests — por cuenta por pagar y usuario
--    Guard: accounts-payable-auth-requests.service.ts
-- ---------------------------------------------------------------------------
UPDATE "account_payable_auth_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "account_payable_auth_requests" o
    WHERE o."account_payable_id" = r."account_payable_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "account_payable_auth_requests_pending_unique"
  ON "account_payable_auth_requests" ("account_payable_id", "requested_by_id")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 6. account_payable_payment_auth_requests — por cuenta por pagar y usuario
--    Guard: accounts-payable-payment-auth-requests.service.ts
--    Su flujo tiene dos pasos, así que "ocupada" incluye ADMIN_APPROVED:
--    aprobada por el admin pero todavía sin registrar en Caja.
-- ---------------------------------------------------------------------------
UPDATE "account_payable_payment_auth_requests" r
SET "status" = 'EXPIRED',
    "admin_notes" = COALESCE(r."admin_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" IN ('PENDING', 'ADMIN_APPROVED')
  AND EXISTS (
    SELECT 1 FROM "account_payable_payment_auth_requests" o
    WHERE o."account_payable_id" = r."account_payable_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."status" IN ('PENDING', 'ADMIN_APPROVED')
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "account_payable_payment_auth_requests_open_unique"
  ON "account_payable_payment_auth_requests" ("account_payable_id", "requested_by_id")
  WHERE "status" IN ('PENDING', 'ADMIN_APPROVED');

-- ---------------------------------------------------------------------------
-- 7. client_ownership_auth_requests — una por orden
--    Nace dentro de la creación de la orden y la orden guarda su propio
--    `client_ownership_auth_status`, así que dos pendientes para la misma orden
--    nunca son correctas. Este módulo no tiene guard en la aplicación: aquí el
--    índice no respalda una validación, la crea.
-- ---------------------------------------------------------------------------
UPDATE "client_ownership_auth_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "client_ownership_auth_requests" o
    WHERE o."order_id" = r."order_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "client_ownership_auth_requests_pending_unique"
  ON "client_ownership_auth_requests" ("order_id")
  WHERE "status" = 'PENDING';

-- ---------------------------------------------------------------------------
-- 8. cash_movement_void_requests — una por movimiento o por pago
--    Guard: cash-movement-void-requests.service.ts, que filtra por
--    cashMovementId o paymentId según cuál venga. Las dos columnas son
--    opcionales, así que van dos índices, cada uno con su IS NOT NULL.
-- ---------------------------------------------------------------------------
UPDATE "cash_movement_void_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND r."cash_movement_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "cash_movement_void_requests" o
    WHERE o."cash_movement_id" = r."cash_movement_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

UPDATE "cash_movement_void_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND r."payment_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "cash_movement_void_requests" o
    WHERE o."payment_id" = r."payment_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "cash_movement_void_requests_pending_movement_unique"
  ON "cash_movement_void_requests" ("cash_movement_id")
  WHERE "status" = 'PENDING' AND "cash_movement_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_movement_void_requests_pending_payment_unique"
  ON "cash_movement_void_requests" ("payment_id")
  WHERE "status" = 'PENDING' AND "payment_id" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 9. refund_requests — una devolución pendiente por orden
--    Guard: refund-requests.service.ts (solo orderId)
-- ---------------------------------------------------------------------------
UPDATE "refund_requests" r
SET "status" = 'EXPIRED',
    "review_notes" = COALESCE(r."review_notes", 'Solicitud duplicada por doble envío; se conservó la solicitud gemela.')
WHERE r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "refund_requests" o
    WHERE o."order_id" = r."order_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "refund_requests_pending_unique"
  ON "refund_requests" ("order_id")
  WHERE "status" = 'PENDING';
