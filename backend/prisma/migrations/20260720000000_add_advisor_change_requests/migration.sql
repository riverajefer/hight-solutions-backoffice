-- Solicitud de cambio de asesor (createdById) de una OP.
-- Migración idempotente: dev y staging comparten la misma DB.

-- Enum ApprovalRequestType: nuevo tipo de solicitud
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'ADVISOR_CHANGE';

-- Enum NotificationType: notificaciones del flujo
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADVISOR_CHANGE_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADVISOR_CHANGE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADVISOR_CHANGE_REQUEST_REJECTED';

-- Tabla advisor_change_requests
CREATE TABLE IF NOT EXISTS "advisor_change_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "current_advisor_id" TEXT NOT NULL,
    "requested_advisor_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "advisor_change_requests_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "advisor_change_requests_order_id_idx"
  ON "advisor_change_requests"("order_id");
CREATE INDEX IF NOT EXISTS "advisor_change_requests_requested_by_id_idx"
  ON "advisor_change_requests"("requested_by_id");
CREATE INDEX IF NOT EXISTS "advisor_change_requests_status_idx"
  ON "advisor_change_requests"("status");

-- Foreign keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_change_requests_order_id_fkey'
  ) THEN
    ALTER TABLE "advisor_change_requests"
      ADD CONSTRAINT "advisor_change_requests_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_change_requests_requested_by_id_fkey'
  ) THEN
    ALTER TABLE "advisor_change_requests"
      ADD CONSTRAINT "advisor_change_requests_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_change_requests_current_advisor_id_fkey'
  ) THEN
    ALTER TABLE "advisor_change_requests"
      ADD CONSTRAINT "advisor_change_requests_current_advisor_id_fkey"
      FOREIGN KEY ("current_advisor_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_change_requests_requested_advisor_id_fkey'
  ) THEN
    ALTER TABLE "advisor_change_requests"
      ADD CONSTRAINT "advisor_change_requests_requested_advisor_id_fkey"
      FOREIGN KEY ("requested_advisor_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_change_requests_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "advisor_change_requests"
      ADD CONSTRAINT "advisor_change_requests_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
