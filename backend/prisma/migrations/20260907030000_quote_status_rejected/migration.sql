-- Agrega el estado REJECTED (Rechazada) al enum QuoteStatus.
-- Va en su propia migración porque PostgreSQL no permite usar un valor de enum
-- recién agregado dentro de la misma transacción en que se crea.
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'REJECTED' AFTER 'NO_RESPONSE';
