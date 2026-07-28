-- Solicitud de asignación de asesor a un cliente (sujeta a aprobación del admin).
-- Al aprobar se crea la fila client_advisors correspondiente.
-- Migración idempotente: dev y staging comparten la misma DB.

-- Enum ApprovalRequestType: nuevo tipo de solicitud
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'CLIENT_ADVISOR_ASSIGNMENT';

-- Enum NotificationType: notificaciones del flujo
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_ADVISOR_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_ADVISOR_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_ADVISOR_REQUEST_REJECTED';

-- Tabla client_advisor_requests
CREATE TABLE IF NOT EXISTS "client_advisor_requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "requested_advisor_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "client_advisor_requests_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "client_advisor_requests_client_id_idx" ON "client_advisor_requests"("client_id");
CREATE INDEX IF NOT EXISTS "client_advisor_requests_requested_by_id_idx" ON "client_advisor_requests"("requested_by_id");
CREATE INDEX IF NOT EXISTS "client_advisor_requests_status_idx" ON "client_advisor_requests"("status");

-- Foreign keys (guarded: ADD CONSTRAINT no soporta IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advisor_requests_client_id_fkey') THEN
    ALTER TABLE "client_advisor_requests"
      ADD CONSTRAINT "client_advisor_requests_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advisor_requests_requested_by_id_fkey') THEN
    ALTER TABLE "client_advisor_requests"
      ADD CONSTRAINT "client_advisor_requests_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advisor_requests_requested_advisor_id_fkey') THEN
    ALTER TABLE "client_advisor_requests"
      ADD CONSTRAINT "client_advisor_requests_requested_advisor_id_fkey"
      FOREIGN KEY ("requested_advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_advisor_requests_reviewed_by_id_fkey') THEN
    ALTER TABLE "client_advisor_requests"
      ADD CONSTRAINT "client_advisor_requests_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
