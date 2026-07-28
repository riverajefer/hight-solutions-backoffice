-- Co-propiedad de clientes: un cliente puede pertenecer a varios asesores.
-- Reemplaza el FK único clients.advisor_id por la tabla de unión client_advisors.
-- Migración idempotente: dev y staging comparten la misma DB.

-- Tabla de unión client_advisors
CREATE TABLE IF NOT EXISTS "client_advisors" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_advisors_pkey" PRIMARY KEY ("id")
);

-- Indexes / unique
CREATE UNIQUE INDEX IF NOT EXISTS "client_advisors_client_id_advisor_id_key" ON "client_advisors"("client_id", "advisor_id");
CREATE INDEX IF NOT EXISTS "client_advisors_advisor_id_idx" ON "client_advisors"("advisor_id");

-- Foreign keys (guarded: ADD CONSTRAINT no soporta IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_advisors_client_id_fkey'
  ) THEN
    ALTER TABLE "client_advisors"
      ADD CONSTRAINT "client_advisors_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_advisors_advisor_id_fkey'
  ) THEN
    ALTER TABLE "client_advisors"
      ADD CONSTRAINT "client_advisors_advisor_id_fkey"
      FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: migra el asesor único existente a la tabla de unión (solo si la columna aún existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'advisor_id'
  ) THEN
    INSERT INTO "client_advisors" ("id", "client_id", "advisor_id", "created_at")
    SELECT gen_random_uuid(), "id", "advisor_id", now()
    FROM "clients"
    WHERE "advisor_id" IS NOT NULL
    ON CONFLICT ("client_id", "advisor_id") DO NOTHING;
  END IF;
END $$;

-- Elimina el FK y la columna única anterior
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_advisor_id_fkey";
DROP INDEX IF EXISTS "clients_advisor_id_idx";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "advisor_id";
