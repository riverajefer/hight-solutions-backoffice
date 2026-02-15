-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'STATUS_CHANGE_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'STATUS_CHANGE_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'STATUS_CHANGE_REQUEST_REJECTED';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED_ON_CREDIT';

-- CreateTable
CREATE TABLE "order_status_change_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "current_status" "OrderStatus" NOT NULL,
    "requested_status" "OrderStatus" NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_change_requests_order_id_idx" ON "order_status_change_requests"("order_id");

-- CreateIndex
CREATE INDEX "order_status_change_requests_requested_by_id_idx" ON "order_status_change_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "order_status_change_requests_status_idx" ON "order_status_change_requests"("status");

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_change_requests" ADD CONSTRAINT "order_status_change_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
