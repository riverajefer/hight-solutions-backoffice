-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'CASH_MOVEMENT_VOID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CASH_VOID_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'CASH_VOID_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CASH_VOID_REQUEST_REJECTED';

-- CreateTable
CREATE TABLE "cash_movement_void_requests" (
    "id" TEXT NOT NULL,
    "cash_movement_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "void_reason" TEXT NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_movement_void_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_movement_void_requests_cash_movement_id_idx" ON "cash_movement_void_requests"("cash_movement_id");

-- CreateIndex
CREATE INDEX "cash_movement_void_requests_requested_by_id_idx" ON "cash_movement_void_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "cash_movement_void_requests_status_idx" ON "cash_movement_void_requests"("status");

-- AddForeignKey
ALTER TABLE "cash_movement_void_requests" ADD CONSTRAINT "cash_movement_void_requests_cash_movement_id_fkey" FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_void_requests" ADD CONSTRAINT "cash_movement_void_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_void_requests" ADD CONSTRAINT "cash_movement_void_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
