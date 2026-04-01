-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'DISCOUNT_APPROVAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DISCOUNT_APPROVAL_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'DISCOUNT_APPROVAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'DISCOUNT_APPROVAL_REJECTED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_approval_status" "EditRequestStatus";

-- CreateTable
CREATE TABLE "discount_approvals" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "discount_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_approvals_order_id_idx" ON "discount_approvals"("order_id");

-- CreateIndex
CREATE INDEX "discount_approvals_discount_id_idx" ON "discount_approvals"("discount_id");

-- CreateIndex
CREATE INDEX "discount_approvals_requested_by_id_idx" ON "discount_approvals"("requested_by_id");

-- CreateIndex
CREATE INDEX "discount_approvals_status_idx" ON "discount_approvals"("status");

-- AddForeignKey
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "order_discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
