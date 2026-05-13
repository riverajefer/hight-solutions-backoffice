-- Add isReversed and reversedAt to AccountPayablePayment
ALTER TABLE "account_payable_payments"
  ADD COLUMN "is_reversed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reversed_at" TIMESTAMP(3);

-- Add NotificationType values for AP payment reversal
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_REQUESTED';
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_GERENCIA_APPROVED';
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_GERENCIA_REJECTED';
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_COMPLETED';
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_CAJA_REJECTED';

-- Create ApPaymentReversalStatus enum
CREATE TYPE "ApPaymentReversalStatus" AS ENUM (
  'PENDING_GERENCIA',
  'PENDING_CAJA',
  'COMPLETED',
  'REJECTED_BY_GERENCIA',
  'REJECTED_BY_CAJA'
);

-- Create AccountPayablePaymentReversalRequest table
CREATE TABLE "account_payable_payment_reversal_requests" (
  "id"                      TEXT NOT NULL,
  "reason"                  TEXT NOT NULL,
  "status"                  "ApPaymentReversalStatus" NOT NULL DEFAULT 'PENDING_GERENCIA',
  "gerencia_reviewed_by_id" TEXT,
  "gerencia_reviewed_at"    TIMESTAMP(3),
  "gerencia_rejection_notes" TEXT,
  "caja_reviewed_by_id"     TEXT,
  "caja_reviewed_at"        TIMESTAMP(3),
  "caja_rejection_notes"    TEXT,
  "payment_auth_request_id" TEXT NOT NULL,
  "requested_by_id"         TEXT NOT NULL,
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "account_payable_payment_reversal_requests_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on payment_auth_request_id (one reversal per payment)
CREATE UNIQUE INDEX "account_payable_payment_reversal_requests_payment_auth_request_id_key"
  ON "account_payable_payment_reversal_requests"("payment_auth_request_id");

-- Indexes
CREATE INDEX "account_payable_payment_reversal_requests_status_idx"
  ON "account_payable_payment_reversal_requests"("status");

CREATE INDEX "account_payable_payment_reversal_requests_requested_by_id_idx"
  ON "account_payable_payment_reversal_requests"("requested_by_id");

-- Foreign keys
ALTER TABLE "account_payable_payment_reversal_requests"
  ADD CONSTRAINT "account_payable_payment_reversal_requests_payment_auth_request_id_fkey"
  FOREIGN KEY ("payment_auth_request_id")
  REFERENCES "account_payable_payment_auth_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_payable_payment_reversal_requests"
  ADD CONSTRAINT "account_payable_payment_reversal_requests_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id")
  REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "account_payable_payment_reversal_requests"
  ADD CONSTRAINT "account_payable_payment_reversal_requests_gerencia_reviewed_by_id_fkey"
  FOREIGN KEY ("gerencia_reviewed_by_id")
  REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "account_payable_payment_reversal_requests"
  ADD CONSTRAINT "account_payable_payment_reversal_requests_caja_reviewed_by_id_fkey"
  FOREIGN KEY ("caja_reviewed_by_id")
  REFERENCES "users"("id") ON UPDATE CASCADE;
