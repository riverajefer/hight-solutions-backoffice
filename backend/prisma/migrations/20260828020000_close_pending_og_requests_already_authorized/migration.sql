-- Cerrar las solicitudes de autorización de OG que ya no tienen nada que pedir.
--
-- La pantalla de "Solicitudes" listaba todo lo que tuviera status PENDING, sin
-- mirar en qué estado estaba la OG. Cuando el admin firmaba directamente sobre la
-- OG en vez de responder la solicitud, la fila se quedaba PENDING para siempre:
-- el cliente veía 106 solicitudes por atender cuando en realidad eran 22.
--
--   OG en PAID              77 solicitudes pendientes
--   OG en ADMIN_AUTHORIZED   7
--   OG en CREATED           22   ← estas sí están esperando de verdad
--
-- Las 84 primeras corresponden a OG que ya tienen firma registrada
-- (`authorized_by_id` y `authorized_at` están puestos en las 84).
--
-- Se marcan APPROVED y no EXPIRED porque lo que el solicitante pidió sí ocurrió,
-- solo que por otra vía. Como revisor queda quien autorizó la OG, para que el
-- historial de autorizaciones cuente lo que realmente pasó. El COALESCE cubre
-- ambientes donde la OG avanzó sin dejar autorizador: ahí se cae al solicitante
-- antes que dejar el campo en NULL, porque `reviewed_by_id` alimenta el timeline.
--
-- El código ya no deja que esto se repita: `findPendingRequests()` filtra por
-- estado de la OG, y autorizar una OG cierra sus solicitudes pendientes.
--
-- Migración idempotente: al volver a correr ya no quedan filas que cumplan el
-- criterio. Dev y staging comparten la misma base de datos.

UPDATE "expense_order_auth_requests" r
SET
  "status" = 'APPROVED',
  "reviewed_by_id" = COALESCE(eo."authorized_by_id", r."requested_by_id"),
  "reviewed_at" = COALESCE(eo."authorized_at", r."created_at"),
  "review_notes" = COALESCE(
    r."review_notes",
    'Autorizada directamente sobre la OG'
  )
FROM "expense_orders" eo
WHERE
  eo."id" = r."expense_order_id"
  AND r."status" = 'PENDING'
  AND eo."status" NOT IN ('DRAFT', 'CREATED');
