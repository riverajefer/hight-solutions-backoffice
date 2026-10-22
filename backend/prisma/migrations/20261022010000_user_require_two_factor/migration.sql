-- Exigir el doble factor a un usuario puntual, además del interruptor por rol.
--
-- `users` no usa @map: la columna va en camelCase y entre comillas.
-- Idempotente: staging y producción conservan migraciones aplicadas a mano.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "requireTwoFactor" BOOLEAN NOT NULL DEFAULT false;
