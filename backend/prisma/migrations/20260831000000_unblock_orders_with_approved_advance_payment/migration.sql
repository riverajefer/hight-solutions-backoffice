-- Destrabar las órdenes marcadas con anticipo rechazado que sí tienen un pago
-- aprobado en pie.
--
-- `orders.advance_payment_status` es un solo campo por orden, pero las
-- solicitudes de aprobación son varias: una por pago. Al escribirlo con el
-- resultado de la última revisión, un rechazo posterior borraba la aprobación
-- de un pago legítimo y `updateStatus()` bloqueaba la orden para siempre: la
-- única ruta que limpiaba el rechazo era registrar un pago nuevo, que en una
-- orden ya pagada sería dinero inventado.
--
-- El caso que lo destapó fue OP-2026-1504: el asesor registró el mismo pago de
-- $7.000 tres veces, Caja aprobó el bueno a las 17:19:53 y rechazó el duplicado
-- a las 17:20:32. La orden quedó trabada en CONFIRMED durante cuatro semanas con
-- el dinero completo ya recibido.
--
-- En producción son 14 órdenes de 41 con la bandera en REJECTED. Las otras 27 no
-- tienen ningún pago aprobado vivo: ese rechazo sí es real y siguen bloqueadas,
-- que es lo que el flujo busca.
--
-- `payment_id` queda en NULL cuando el pago se elimina (ON DELETE SET NULL), así
-- que "aprobada y con payment_id" es exactamente "el pago sigue existiendo".
--
-- El código ya no deja que se repita: `syncOrderAdvanceStatus()` deriva el campo
-- del conjunto de solicitudes en vez de escribir el resultado de la última.
--
-- Migración idempotente: al volver a correr ya no quedan filas que cumplan el
-- criterio. Dev y staging comparten la misma base de datos.

UPDATE "orders" o
SET
  "advance_payment_status" = 'APPROVED',
  "advance_payment_rejected_reason" = NULL
WHERE
  o."advance_payment_status" = 'REJECTED'
  -- Si hay algo esperando respuesta de Caja, la orden sigue bloqueada en PENDING
  -- por su propia cuenta; no es este el saneamiento que le toca.
  AND NOT EXISTS (
    SELECT 1
    FROM "advance_payment_approvals" p
    WHERE p."order_id" = o."id"
      AND p."status" = 'PENDING'
  )
  AND EXISTS (
    SELECT 1
    FROM "advance_payment_approvals" a
    WHERE a."order_id" = o."id"
      AND a."status" = 'APPROVED'
      AND a."payment_id" IS NOT NULL
  );
