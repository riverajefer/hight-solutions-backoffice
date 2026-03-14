-- AlterEnum: Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'ADVANCE_PAYMENT_APPROVAL_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'ADVANCE_PAYMENT_APPROVAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'ADVANCE_PAYMENT_APPROVAL_REJECTED';

-- AlterTable: Add advancePaymentStatus to orders
ALTER TABLE "orders" ADD COLUMN "advance_payment_status" "EditRequestStatus";

-- CreateTable: advance_payment_approvals
CREATE TABLE "advance_payment_approvals" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_payment_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advance_payment_approvals_payment_id_key" ON "advance_payment_approvals"("payment_id");
CREATE INDEX "advance_payment_approvals_order_id_idx" ON "advance_payment_approvals"("order_id");
CREATE INDEX "advance_payment_approvals_requested_by_id_idx" ON "advance_payment_approvals"("requested_by_id");
CREATE INDEX "advance_payment_approvals_status_idx" ON "advance_payment_approvals"("status");

-- AddForeignKey
ALTER TABLE "advance_payment_approvals" ADD CONSTRAINT "advance_payment_approvals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advance_payment_approvals" ADD CONSTRAINT "advance_payment_approvals_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "advance_payment_approvals" ADD CONSTRAINT "advance_payment_approvals_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "advance_payment_approvals" ADD CONSTRAINT "advance_payment_approvals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
