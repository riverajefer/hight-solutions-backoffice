-- Cerrar las solicitudes de OG que quedaron colgadas por el doble envío.
--
-- Antes del índice `expense_order_auth_requests_pending_unique`, un solo clic
-- podía crear dos solicitudes idénticas. El administrador aprobaba una y la otra
-- se quedaba PENDING para siempre, ocupando un lugar en "Solicitudes Pendientes"
-- que nadie iba a cerrar: no corresponde a nada que el usuario haya pedido dos
-- veces.
--
-- La migración anterior solo resolvió los pares donde AMBAS seguían pendientes,
-- porque eran las únicas que impedían crear el índice. Faltan los pares donde la
-- gemela ya se resolvió; en producción son dos:
--
--   OG-2026-0444  PENDING 17:56:19.962  ←  gemela APPROVED 17:56:19.967
--   OG-2026-0445  PENDING 17:58:27.396  ←  gemela APPROVED 17:58:27.410
--
-- El criterio es deliberadamente estrecho: misma OG, mismo solicitante, gemela ya
-- resuelta y creadas con menos de un segundo de diferencia. Eso solo lo produce
-- el doble envío. Dos solicitudes reales del mismo usuario para la misma OG están
-- separadas por minutos u horas (OG-2026-0043, 0044 y 0045 lo están por casi dos
-- horas), y las de usuarios distintos no entran en el criterio: OG-2026-0329
-- tiene dos pendientes, de catalina y de adriana, y las dos son legítimas.
--
-- Se marcan EXPIRED y no REJECTED: nadie las revisó, así que REJECTED daría a
-- entender que un administrador las negó.
--
-- Migración idempotente: al volver a correr ya no quedan filas PENDING que
-- cumplan el criterio. Dev y staging comparten la misma base de datos.

UPDATE "expense_order_auth_requests" r
SET
  "status" = 'EXPIRED',
  "review_notes" = COALESCE(
    r."review_notes",
    'Solicitud duplicada por doble envío; la gemela ya fue resuelta.'
  )
WHERE
  r."status" = 'PENDING'
  AND EXISTS (
    SELECT 1
    FROM "expense_order_auth_requests" o
    WHERE
      o."expense_order_id" = r."expense_order_id"
      AND o."requested_by_id" = r."requested_by_id"
      AND o."id" <> r."id"
      AND o."status" <> 'PENDING'
      AND abs(EXTRACT(EPOCH FROM (o."created_at" - r."created_at"))) < 1
  );
