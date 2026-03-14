-- AlterEnum: Add client ownership notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_OWNERSHIP_AUTH_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_OWNERSHIP_AUTH_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLIENT_OWNERSHIP_AUTH_REJECTED';

-- AlterTable clients: Add advisor_id column
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "advisor_id" TEXT;

-- Add foreign key constraint for advisor_id on clients
ALTER TABLE "clients" ADD CONSTRAINT "clients_advisor_id_fkey"
  FOREIGN KEY ("advisor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable orders: Add client_ownership_auth_status column
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "client_ownership_auth_status" "EditRequestStatus";

-- CreateTable: client_ownership_auth_requests
CREATE TABLE IF NOT EXISTS "client_ownership_auth_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_ownership_auth_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for client_ownership_auth_requests
CREATE INDEX IF NOT EXISTS "client_ownership_auth_requests_order_id_idx"
  ON "client_ownership_auth_requests"("order_id");

CREATE INDEX IF NOT EXISTS "client_ownership_auth_requests_requested_by_id_idx"
  ON "client_ownership_auth_requests"("requested_by_id");

CREATE INDEX IF NOT EXISTS "client_ownership_auth_requests_advisor_id_idx"
  ON "client_ownership_auth_requests"("advisor_id");

CREATE INDEX IF NOT EXISTS "client_ownership_auth_requests_status_idx"
  ON "client_ownership_auth_requests"("status");

-- AddForeignKey: client_ownership_auth_requests -> orders
ALTER TABLE "client_ownership_auth_requests" ADD CONSTRAINT "client_ownership_auth_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: client_ownership_auth_requests -> users (requestedBy)
ALTER TABLE "client_ownership_auth_requests" ADD CONSTRAINT "client_ownership_auth_requests_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: client_ownership_auth_requests -> users (advisor)
ALTER TABLE "client_ownership_auth_requests" ADD CONSTRAINT "client_ownership_auth_requests_advisor_id_fkey"
  FOREIGN KEY ("advisor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: client_ownership_auth_requests -> users (reviewedBy)
ALTER TABLE "client_ownership_auth_requests" ADD CONSTRAINT "client_ownership_auth_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
