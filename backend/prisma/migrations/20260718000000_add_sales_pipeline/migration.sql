-- Pipeline de Ventas: prospectos y su historial de contactos.
-- Migración idempotente: dev y staging comparten la misma DB.

-- Enums (Postgres no soporta CREATE TYPE IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProspectStatus') THEN
    CREATE TYPE "ProspectStatus" AS ENUM ('NUEVO', 'EN_SEGUIMIENTO', 'COTIZADO', 'CONVERTIDO', 'PERDIDO', 'NO_INTERESADO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactMedium') THEN
    CREATE TYPE "ContactMedium" AS ENUM ('WHATSAPP', 'LLAMADA', 'CORREO', 'PRESENCIAL', 'REDES', 'OTRO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactOutcome') THEN
    CREATE TYPE "ContactOutcome" AS ENUM ('CONTESTO', 'NO_CONTESTO', 'SOLICITO_COTIZACION', 'NO_INTERESADO', 'REPROGRAMAR');
  END IF;
END $$;

-- Tabla prospects
CREATE TABLE IF NOT EXISTS "prospects" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "observation" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NUEVO',
    "advisor_id" TEXT NOT NULL,
    "client_id" TEXT,
    "quote_id" TEXT,
    "order_id" TEXT,
    "last_contact_at" TIMESTAMP(3),
    "contact_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prospects_advisor_id_idx" ON "prospects"("advisor_id");
CREATE INDEX IF NOT EXISTS "prospects_status_idx" ON "prospects"("status");
CREATE INDEX IF NOT EXISTS "prospects_last_contact_at_idx" ON "prospects"("last_contact_at");
CREATE INDEX IF NOT EXISTS "prospects_created_at_idx" ON "prospects"("created_at");

-- Tabla prospect_contacts
CREATE TABLE IF NOT EXISTS "prospect_contacts" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "contact_date" TIMESTAMP(3) NOT NULL,
    "medium" "ContactMedium" NOT NULL,
    "outcome" "ContactOutcome",
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prospect_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prospect_contacts_prospect_id_idx" ON "prospect_contacts"("prospect_id");
CREATE INDEX IF NOT EXISTS "prospect_contacts_contact_date_idx" ON "prospect_contacts"("contact_date");
CREATE INDEX IF NOT EXISTS "prospect_contacts_medium_idx" ON "prospect_contacts"("medium");

-- Foreign keys de prospects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospects_advisor_id_fkey') THEN
    ALTER TABLE "prospects" ADD CONSTRAINT "prospects_advisor_id_fkey"
      FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospects_created_by_id_fkey') THEN
    ALTER TABLE "prospects" ADD CONSTRAINT "prospects_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospects_client_id_fkey') THEN
    ALTER TABLE "prospects" ADD CONSTRAINT "prospects_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospects_quote_id_fkey') THEN
    ALTER TABLE "prospects" ADD CONSTRAINT "prospects_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospects_order_id_fkey') THEN
    ALTER TABLE "prospects" ADD CONSTRAINT "prospects_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Foreign keys de prospect_contacts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_contacts_prospect_id_fkey') THEN
    ALTER TABLE "prospect_contacts" ADD CONSTRAINT "prospect_contacts_prospect_id_fkey"
      FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_contacts_created_by_id_fkey') THEN
    ALTER TABLE "prospect_contacts" ADD CONSTRAINT "prospect_contacts_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
