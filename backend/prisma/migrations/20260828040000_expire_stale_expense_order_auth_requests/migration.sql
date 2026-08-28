-- Vencer las solicitudes de autorización de OG que llevan semanas sin respuesta.
--
-- Estas NO son fantasma, y por eso el tratamiento es distinto al de las 84 que
-- cerró `20260828020000`. Allá las OG ya estaban firmadas y la solicitud sobraba;
-- acá las 20 OG siguen en CREATED: nadie las autorizó, ni por la solicitud ni por
-- fuera. Son pedidos reales que quedaron sin responder entre el 31 de julio y el
-- 8 de agosto, de 2 asesores.
--
-- Se cierran por decisión del cliente, que quiere la bandeja solo con lo del día.
-- Las 2 solicitudes de hoy se dejan intactas.
--
-- IMPORTANTE: se marcan EXPIRED, nunca APPROVED. `hasApprovedRequest()` es lo que
-- habilita a un no-admin a autorizar la OG por su cuenta, así que marcarlas
-- APPROVED le daría a esos 2 asesores permiso para firmar 20 OG que ningún
-- administrador aprobó. Sería una escalación de permisos silenciosa.
--
-- (En `20260828020000` sí se usó APPROVED sin ese riesgo: aquellas OG ya estaban
-- en ADMIN_AUTHORIZED o PAID, y la transición a ADMIN_AUTHORIZED solo se permite
-- desde CREATED o DRAFT, así que el permiso no habilitaba nada.)
--
-- Consecuencia a tener presente: si alguna de esas 20 OG todavía necesita firma,
-- el asesor tiene que volver a solicitarla. El índice único parcial no lo impide,
-- porque la fila vieja deja de estar en PENDING.
--
-- Migración idempotente: al volver a correr ya no quedan filas anteriores a hoy
-- en PENDING. Dev y staging comparten la misma base de datos.

UPDATE "expense_order_auth_requests" r
SET
  "status" = 'EXPIRED',
  "reviewed_at" = COALESCE(r."reviewed_at", now()),
  "review_notes" = COALESCE(
    r."review_notes",
    'Vencida sin respuesta; si la OG aún necesita autorización, hay que solicitarla de nuevo'
  )
WHERE
  r."status" = 'PENDING'
  AND r."created_at" < date_trunc('day', now());
