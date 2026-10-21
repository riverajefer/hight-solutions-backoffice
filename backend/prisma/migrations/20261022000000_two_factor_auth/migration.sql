-- Doble factor de autenticación (TOTP con app autenticadora).
--
-- `users` y `roles` no usan @map: sus columnas nuevas van en camelCase y entre
-- comillas. Las tablas nuevas siguen la convención snake_case.
--
-- Idempotente: staging y producción conservan migraciones aplicadas a mano.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorLastUsedStep" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorLockedUntil" TIMESTAMP(3);

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "requireTwoFactor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "two_factor_method" TEXT;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET';

CREATE TABLE IF NOT EXISTS "two_factor_backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_backup_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "two_factor_backup_codes_user_id_idx" ON "two_factor_backup_codes"("user_id");

DO $$ BEGIN
  ALTER TABLE "two_factor_backup_codes"
    ADD CONSTRAINT "two_factor_backup_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");
CREATE INDEX IF NOT EXISTS "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

DO $$ BEGIN
  ALTER TABLE "trusted_devices"
    ADD CONSTRAINT "trusted_devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
