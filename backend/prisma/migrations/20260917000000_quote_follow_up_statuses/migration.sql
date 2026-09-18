-- Tres estados de seguimiento entre «Enviada» y el resto del flujo comercial.
-- Migración idempotente: dev y staging comparten la misma DB.
--
-- Se insertan con AFTER para que el orden del enum en Postgres siga el orden
-- del flujo: un ORDER BY status agrupa los seguimientos junto a «Enviada» y no
-- al final de la lista.
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_1' AFTER 'SENT';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_2' AFTER 'FOLLOW_UP_1';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_3' AFTER 'FOLLOW_UP_2';
