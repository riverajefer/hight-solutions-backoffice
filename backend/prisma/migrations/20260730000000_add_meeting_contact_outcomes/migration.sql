-- Add "Reunión Física" and "Reunión Virtual" outcomes to ContactOutcome.
-- Idempotent: dev and staging share the same database.
ALTER TYPE "ContactOutcome" ADD VALUE IF NOT EXISTS 'REUNION_FISICA';
ALTER TYPE "ContactOutcome" ADD VALUE IF NOT EXISTS 'REUNION_VIRTUAL';
