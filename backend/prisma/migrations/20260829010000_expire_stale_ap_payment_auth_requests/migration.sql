-- Vencer las solicitudes de pago de CP que llevan semanas sin respuesta.
--
-- En producción había 50 en PENDING, del 3 al 28 de agosto, todas sobre CP en
-- OVERDUE. Ninguna es fantasma: la CP no se pagó por otra vía, simplemente nadie
-- respondió la solicitud.
--
-- Cerrarlas no es solo cosmético. `create()` rechaza una solicitud nueva si ya
-- existe una en PENDING o ADMIN_APPROVED para la misma CP y el mismo usuario, así
-- que cada una de esas 50 está impidiendo que su solicitante vuelva a pedir el
-- pago de una cuenta ya vencida. Vencerlas los desbloquea.
--
-- La deuda no se pierde: la CP sigue en OVERDUE con su saldo. Lo que desaparece
-- es la solicitud sin responder.
--
-- Solo se tocan las anteriores a hoy, y solo las que están en PENDING. Las que
-- están en ADMIN_APPROVED se dejan: ahí un administrador ya aprobó y lo que falta
-- es la firma de Caja, que es otra bandeja y otra decisión.
--
-- Va en una migración aparte de la que agrega el valor EXPIRED al enum porque
-- PostgreSQL no permite usar un valor de enum en la misma transacción en que se
-- agrega.
--
-- Migración idempotente: al volver a correr ya no quedan filas anteriores a hoy
-- en PENDING. Dev y staging comparten la misma base de datos.

UPDATE "account_payable_payment_auth_requests"
SET
  "status" = 'EXPIRED',
  "admin_reviewed_at" = COALESCE("admin_reviewed_at", now()),
  "admin_notes" = COALESCE(
    "admin_notes",
    'Vencida sin respuesta; si el pago sigue haciendo falta, hay que solicitarlo de nuevo'
  )
WHERE
  "status" = 'PENDING'
  AND "created_at" < date_trunc('day', now());
