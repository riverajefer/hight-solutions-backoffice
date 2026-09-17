-- Solicitud para restaurar una cotización rechazada (autorización de admin).
-- Migración idempotente: dev y staging comparten la misma DB.

-- Enum ApprovalRequestType: nuevo tipo de solicitud
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'QUOTE_RESTORE';

-- Enum NotificationType: notificaciones del flujo
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_RESTORE_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_RESTORE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'QUOTE_RESTORE_REQUEST_REJECTED';

-- Estado desde el que se rechazó la cotización: destino de la restauración
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejected_from_status" "QuoteStatus";

-- Backfill de las rechazadas existentes desde audit_logs (último UPDATE que
-- las llevó a REJECTED). Las que no tengan historial quedan en NULL y el
-- servicio las restaura a SENT.
UPDATE "quotes" q
SET "rejected_from_status" = prev.status::"QuoteStatus"
FROM (
  SELECT DISTINCT ON (a.record_id) a.record_id, a.old_data->>'status' AS status
  FROM "audit_logs" a
  WHERE a.model = 'Quote'
    AND a.new_data->>'status' = 'REJECTED'
    AND a.old_data->>'status' IN ('DRAFT', 'SENT', 'ACCEPTED', 'NO_RESPONSE')
  ORDER BY a.record_id, a.created_at DESC
) prev
WHERE q.id = prev.record_id
  AND q.status = 'REJECTED'
  AND q.rejected_from_status IS NULL;

-- Tabla quote_restore_requests
CREATE TABLE IF NOT EXISTS "quote_restore_requests" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "restore_to_status" "QuoteStatus" NOT NULL,
    "previous_rejection_reason" TEXT,
    "previous_rejected_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quote_restore_requests_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "quote_restore_requests_quote_id_idx"
  ON "quote_restore_requests"("quote_id");
CREATE INDEX IF NOT EXISTS "quote_restore_requests_requested_by_id_idx"
  ON "quote_restore_requests"("requested_by_id");
CREATE INDEX IF NOT EXISTS "quote_restore_requests_status_idx"
  ON "quote_restore_requests"("status");

-- Una sola solicitud pendiente por cotización (cierra la carrera del doble clic)
CREATE UNIQUE INDEX IF NOT EXISTS "quote_restore_requests_pending_unique"
  ON "quote_restore_requests" ("quote_id")
  WHERE "status" = 'PENDING';

-- Foreign keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_restore_requests_quote_id_fkey'
  ) THEN
    ALTER TABLE "quote_restore_requests"
      ADD CONSTRAINT "quote_restore_requests_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_restore_requests_requested_by_id_fkey'
  ) THEN
    ALTER TABLE "quote_restore_requests"
      ADD CONSTRAINT "quote_restore_requests_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_restore_requests_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "quote_restore_requests"
      ADD CONSTRAINT "quote_restore_requests_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
