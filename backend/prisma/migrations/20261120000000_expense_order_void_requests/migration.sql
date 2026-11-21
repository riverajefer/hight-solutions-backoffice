-- Anulación de una OG con aprobación del admin (estado VOIDED y solicitudes).

-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'EXPENSE_ORDER_VOID';

-- AlterEnum
ALTER TYPE "ExpenseOrderStatus" ADD VALUE 'VOIDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_VOID_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_VOID_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ORDER_VOID_REQUEST_REJECTED';

-- AlterTable
ALTER TABLE "expense_orders" ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by_id" TEXT;

-- CreateTable
CREATE TABLE "expense_order_void_requests" (
    "id" TEXT NOT NULL,
    "expense_order_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "cash_stayed_in_drawer" BOOLEAN,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "applied_effect" JSONB,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_order_void_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_order_void_requests_expense_order_id_idx" ON "expense_order_void_requests"("expense_order_id");

-- CreateIndex
CREATE INDEX "expense_order_void_requests_requested_by_id_idx" ON "expense_order_void_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "expense_order_void_requests_status_idx" ON "expense_order_void_requests"("status");

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_void_requests" ADD CONSTRAINT "expense_order_void_requests_expense_order_id_fkey" FOREIGN KEY ("expense_order_id") REFERENCES "expense_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_void_requests" ADD CONSTRAINT "expense_order_void_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_void_requests" ADD CONSTRAINT "expense_order_void_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Una sola solicitud pendiente por OG: el doble clic crea dos solicitudes con
-- milisegundos de diferencia y un `findFirst` no lo frena.
CREATE UNIQUE INDEX "expense_order_void_requests_pending_unique"
  ON "expense_order_void_requests"("expense_order_id")
  WHERE "status" = 'PENDING';

-- Una OG se anula una sola vez.
CREATE UNIQUE INDEX "expense_order_void_requests_approved_unique"
  ON "expense_order_void_requests"("expense_order_id")
  WHERE "status" = 'APPROVED';
