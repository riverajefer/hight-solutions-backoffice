-- CreateEnum
CREATE TYPE "ApPaymentAuthRequestStatus" AS ENUM ('PENDING', 'ADMIN_APPROVED', 'COMPLETED', 'ADMIN_REJECTED', 'CAJA_REJECTED');

-- AlterEnum
ALTER TYPE "AccountPayableStatus" ADD VALUE 'ADMIN_AUTHORIZED';

-- AlterEnum
ALTER TYPE "ApprovalRequestType" ADD VALUE 'AP_AUTH';
ALTER TYPE "ApprovalRequestType" ADD VALUE 'AP_PAYMENT_AUTH';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AP_AUTH_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'AP_AUTH_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'AP_AUTH_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'AP_PAYMENT_AUTH_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'AP_PAYMENT_AUTH_ADMIN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'AP_PAYMENT_AUTH_ADMIN_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'AP_PAYMENT_AUTH_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'AP_PAYMENT_AUTH_CAJA_REJECTED';

-- AlterTable
ALTER TABLE "account_payable_payments" ADD COLUMN     "payment_auth_request_id" TEXT;

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "authorized_at" TIMESTAMP(3),
ADD COLUMN     "authorized_by_id" TEXT;

-- AlterTable
ALTER TABLE "expense_orders" ADD COLUMN     "caja_rejected_at" TIMESTAMP(3),
ADD COLUMN     "caja_rejected_by_id" TEXT,
ADD COLUMN     "caja_rejection_reason" TEXT;

-- CreateTable
CREATE TABLE "account_payable_auth_requests" (
    "id" TEXT NOT NULL,
    "account_payable_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payable_auth_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payable_payment_auth_requests" (
    "id" TEXT NOT NULL,
    "account_payable_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receipt_file_id" TEXT,
    "reason" TEXT,
    "status" "ApPaymentAuthRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_reviewed_by_id" TEXT,
    "admin_reviewed_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "caja_reviewed_by_id" TEXT,
    "caja_reviewed_at" TIMESTAMP(3),
    "caja_rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payable_payment_auth_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_payable_auth_requests_account_payable_id_idx" ON "account_payable_auth_requests"("account_payable_id");

-- CreateIndex
CREATE INDEX "account_payable_auth_requests_requested_by_id_idx" ON "account_payable_auth_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "account_payable_auth_requests_status_idx" ON "account_payable_auth_requests"("status");

-- CreateIndex
CREATE INDEX "account_payable_payment_auth_requests_account_payable_id_idx" ON "account_payable_payment_auth_requests"("account_payable_id");

-- CreateIndex
CREATE INDEX "account_payable_payment_auth_requests_requested_by_id_idx" ON "account_payable_payment_auth_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "account_payable_payment_auth_requests_status_idx" ON "account_payable_payment_auth_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "account_payable_payments_payment_auth_request_id_key" ON "account_payable_payments"("payment_auth_request_id");

-- CreateIndex (skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_key') THEN
    CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_caja_rejected_by_id_fkey" FOREIGN KEY ("caja_rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_auth_requests" ADD CONSTRAINT "account_payable_auth_requests_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_auth_requests" ADD CONSTRAINT "account_payable_auth_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_auth_requests" ADD CONSTRAINT "account_payable_auth_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payments" ADD CONSTRAINT "account_payable_payments_payment_auth_request_id_fkey" FOREIGN KEY ("payment_auth_request_id") REFERENCES "account_payable_payment_auth_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payment_auth_requests" ADD CONSTRAINT "account_payable_payment_auth_requests_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payment_auth_requests" ADD CONSTRAINT "account_payable_payment_auth_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payment_auth_requests" ADD CONSTRAINT "account_payable_payment_auth_requests_admin_reviewed_by_id_fkey" FOREIGN KEY ("admin_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payment_auth_requests" ADD CONSTRAINT "account_payable_payment_auth_requests_caja_reviewed_by_id_fkey" FOREIGN KEY ("caja_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
