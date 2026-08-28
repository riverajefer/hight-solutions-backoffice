-- Notificación para el barrido que vence solicitudes sin respuesta.
--
-- Un solo valor genérico para los 12 tipos de solicitud: el texto del mensaje
-- lleva de cuál se trata, así que no hace falta un valor por tipo.
--
-- ADD VALUE dentro de una transacción es válido desde PostgreSQL 12 mientras el
-- valor nuevo no se use en la misma transacción, y acá solo se agrega.
-- Producción corre PostgreSQL 17.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_REQUEST_EXPIRED';
