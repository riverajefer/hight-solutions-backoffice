-- Cerrar las solicitudes viejas de cambio de estado que ya no piden nada.
--
-- Mismo patrón que las solicitudes de OG: la pantalla listaba todo lo que tuviera
-- status PENDING sin mirar la orden. Si un admin anula la orden directamente en
-- vez de responder la solicitud, la fila se queda PENDING para siempre.
--
-- Las tres pendientes en producción eran justamente eso — las tres órdenes ya
-- estaban en ANULADO, que era el estado solicitado:
--
--   OP-2026-1590   solicitada 2026-08-04   orden ya ANULADO
--   OP-2026-1662   solicitada 2026-08-06   orden ya ANULADO
--   OP-2026-2077   solicitada 2026-08-28   orden ya ANULADO
--
-- Por decisión del cliente solo se cierran las anteriores a hoy: la del 28 se deja
-- para que la revise él mismo. El filtro nuevo en `findPendingRequests()` ya evita
-- que se muestre, así que dejarla abierta no ensucia la pantalla.
--
-- Se marcan APPROVED porque lo que el solicitante pidió sí ocurrió. `reviewed_by_id`
-- queda en NULL a propósito: las órdenes no registran quién las anuló y no existe
-- una solicitud hermana aprobada de dónde copiarlo, así que inventar un revisor
-- sería peor que dejar constancia de que nadie la adjudicó. De aquí en adelante sí
-- hay atribución real: `closePendingRequestsForReachedStatus()` guarda a quien
-- ejecuta el cambio.
--
-- Migración idempotente: al volver a correr ya no quedan filas que cumplan el
-- criterio. Dev y staging comparten la misma base de datos.

UPDATE "order_status_change_requests" r
SET
  "status" = 'APPROVED',
  "reviewed_at" = COALESCE(r."reviewed_at", now()),
  "review_notes" = COALESCE(
    r."review_notes",
    'La orden ya había sido llevada al estado solicitado por otra vía'
  )
FROM "orders" o
WHERE
  o."id" = r."order_id"
  AND r."status" = 'PENDING'
  AND o."status" = r."requested_status"
  AND r."created_at" < date_trunc('day', now());
