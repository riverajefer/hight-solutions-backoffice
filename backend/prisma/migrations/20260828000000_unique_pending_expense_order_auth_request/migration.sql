-- Una sola solicitud de autorización PENDIENTE por OG y usuario.
--
-- `create()` valida con un findFirst ("¿ya tienes una pendiente?") y después
-- inserta, sin nada que respalde la validación en la base. Dos peticiones
-- concurrentes leen las dos "no hay pendiente" antes de que cualquiera inserte,
-- y ambas crean su fila: una sola acción del usuario termina generando dos
-- solicitudes idénticas y, por lo tanto, dos notificaciones de WhatsApp.
--
-- Casos reales en producción, con el mismo motivo y milisegundos de diferencia:
--   OG-2026-0444  17:56:19.962 y 17:56:19.967   (5 ms)
--   OG-2026-0445  17:58:27.396 y 17:58:27.410  (14 ms)
--   OG-2026-0317  20:56:28.082 y 20:56:28.083   (1 ms)
-- Además de la notificación repetida, la solicitud que no se aprueba se queda
-- PENDING para siempre en "Solicitudes Pendientes".
--
-- El índice parcial mueve la garantía a Postgres, donde la carrera no existe.
-- Mismo patrón que `cash_sessions_one_open_per_register`.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

-- 1. Resolver los duplicados que ya están en la base, o el índice no puede crearse.
--    Se conserva la solicitud más antigua de cada par y se marca la otra como
--    EXPIRED: nadie la revisó, así que REJECTED daría a entender que un
--    administrador la negó.
UPDATE "expense_order_auth_requests" r
SET
  "status" = 'EXPIRED',
  "review_notes" = COALESCE(
    r."review_notes",
    'Solicitud duplicada por doble envío; se conservó la solicitud gemela.'
  )
WHERE
  r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1
    FROM "expense_order_auth_requests" o
    WHERE
      o."expense_order_id" = r."expense_order_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."status" = 'PENDING'
      AND (o."created_at", o."id") < (r."created_at", r."id")
  );

-- 2. Impedir que vuelva a pasar.
CREATE UNIQUE INDEX IF NOT EXISTS "expense_order_auth_requests_pending_unique"
  ON "expense_order_auth_requests" ("expense_order_id", "requested_by_id")
  WHERE "status" = 'PENDING';
