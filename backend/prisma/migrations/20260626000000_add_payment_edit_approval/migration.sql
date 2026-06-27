-- Aprobación de edición de pagos (PaymentEditApproval)
-- Migración idempotente: dev y staging comparten la misma DB.

-- Nuevos valores de enums
ALTER TYPE "ApprovalRequestType" ADD VALUE IF NOT EXISTS 'PAYMENT_EDIT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_EDIT_APPROVAL_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_EDIT_APPROVAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_EDIT_APPROVAL_REJECTED';

-- Tabla payment_edit_approvals
CREATE TABLE IF NOT EXISTS "payment_edit_approvals" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "old_amount" DECIMAL(65,30) NOT NULL,
    "old_payment_method" "PaymentMethod" NOT NULL,
    "old_payment_date" TIMESTAMP(3) NOT NULL,
    "old_reference" TEXT,
    "old_notes" TEXT,
    "new_amount" DECIMAL(65,30),
    "new_payment_method" "PaymentMethod",
    "new_payment_date" TIMESTAMP(3),
    "new_reference" TEXT,
    "new_notes" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_edit_approvals_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX IF NOT EXISTS "payment_edit_approvals_order_id_idx" ON "payment_edit_approvals"("order_id");
CREATE INDEX IF NOT EXISTS "payment_edit_approvals_payment_id_idx" ON "payment_edit_approvals"("payment_id");
CREATE INDEX IF NOT EXISTS "payment_edit_approvals_requested_by_id_idx" ON "payment_edit_approvals"("requested_by_id");
CREATE INDEX IF NOT EXISTS "payment_edit_approvals_status_idx" ON "payment_edit_approvals"("status");

-- Foreign keys (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_edit_approvals_order_id_fkey'
  ) THEN
    ALTER TABLE "payment_edit_approvals"
      ADD CONSTRAINT "payment_edit_approvals_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_edit_approvals_payment_id_fkey'
  ) THEN
    ALTER TABLE "payment_edit_approvals"
      ADD CONSTRAINT "payment_edit_approvals_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_edit_approvals_requested_by_id_fkey'
  ) THEN
    ALTER TABLE "payment_edit_approvals"
      ADD CONSTRAINT "payment_edit_approvals_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_edit_approvals_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "payment_edit_approvals"
      ADD CONSTRAINT "payment_edit_approvals_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
