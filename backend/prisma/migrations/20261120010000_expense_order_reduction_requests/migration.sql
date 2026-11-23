-- Bajar el valor de una OG pagada con aprobación de un admin distinto (y reintegro a caja).

-- CreateEnum
CREATE TYPE "ExpenseOrderReductionMoneyLocation" AS ENUM ('SUPPLIER_RETURNS', 'NEVER_LEFT');

-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'EXPENSE_ORDER_REDUCTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_REDUCTION_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_REDUCTION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_REDUCTION_REJECTED';

-- CreateTable
CREATE TABLE "expense_order_reduction_requests" (
    "id" TEXT NOT NULL,
    "expense_order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "new_items" JSONB NOT NULL,
    "previous_total" DECIMAL(14,2) NOT NULL,
    "new_total" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "money_location" "ExpenseOrderReductionMoneyLocation" NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "applied_effect" JSONB,
    "applied_at" TIMESTAMP(3),
    "refund_movement_id" TEXT,
    "refund_received_at" TIMESTAMP(3),
    "refund_received_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_order_reduction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_order_reduction_requests_refund_movement_id_key" ON "expense_order_reduction_requests"("refund_movement_id");

-- CreateIndex
CREATE INDEX "expense_order_reduction_requests_expense_order_id_idx" ON "expense_order_reduction_requests"("expense_order_id");

-- CreateIndex
CREATE INDEX "expense_order_reduction_requests_requested_by_id_idx" ON "expense_order_reduction_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "expense_order_reduction_requests_status_idx" ON "expense_order_reduction_requests"("status");

-- AddForeignKey
ALTER TABLE "expense_order_reduction_requests" ADD CONSTRAINT "expense_order_reduction_requests_expense_order_id_fkey" FOREIGN KEY ("expense_order_id") REFERENCES "expense_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_reduction_requests" ADD CONSTRAINT "expense_order_reduction_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_reduction_requests" ADD CONSTRAINT "expense_order_reduction_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_reduction_requests" ADD CONSTRAINT "expense_order_reduction_requests_refund_received_by_id_fkey" FOREIGN KEY ("refund_received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_reduction_requests" ADD CONSTRAINT "expense_order_reduction_requests_refund_movement_id_fkey" FOREIGN KEY ("refund_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Una sola solicitud pendiente por OG (doble clic).
CREATE UNIQUE INDEX "expense_order_reduction_requests_pending_unique"
  ON "expense_order_reduction_requests"("expense_order_id")
  WHERE "status" = 'PENDING';
