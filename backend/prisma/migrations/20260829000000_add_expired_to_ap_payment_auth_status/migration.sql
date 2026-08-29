-- Estado EXPIRED para las solicitudes de pago de Cuenta por Pagar.
--
-- El barrido automático necesita un estado terminal que no mienta. Los que ya
-- existían no sirven: ADMIN_REJECTED y CAJA_REJECTED afirman que alguien revisó
-- y negó la solicitud, y acá justamente nadie la revisó.
--
-- ADD VALUE dentro de una transacción es válido desde PostgreSQL 12 mientras el
-- valor nuevo no se use en la misma transacción, y acá solo se agrega. La
-- migración que lo usa va aparte, a propósito. Producción corre PostgreSQL 17.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TYPE "ApPaymentAuthRequestStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
