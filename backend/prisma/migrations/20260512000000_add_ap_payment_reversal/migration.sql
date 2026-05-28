-- Add isReversed and reversedAt to AccountPayablePayment (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_payable_payments' AND column_name = 'is_reversed'
  ) THEN
    ALTER TABLE "account_payable_payments" ADD COLUMN "is_reversed" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_payable_payments' AND column_name = 'reversed_at'
  ) THEN
    ALTER TABLE "account_payable_payments" ADD COLUMN "reversed_at" TIMESTAMP(3);
  END IF;
END $$;

-- Add NotificationType values for AP payment reversal
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_GERENCIA_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_GERENCIA_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AP_PAYMENT_REVERSAL_CAJA_REJECTED';

-- Create ApPaymentReversalStatus enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ApPaymentReversalStatus" AS ENUM (
    'PENDING_GERENCIA',
    'PENDING_CAJA',
    'COMPLETED',
    'REJECTED_BY_GERENCIA',
    'REJECTED_BY_CAJA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create AccountPayablePaymentReversalRequest table (idempotent)
CREATE TABLE IF NOT EXISTS "account_payable_payment_reversal_requests" (
  "id"                       TEXT NOT NULL,
  "reason"                   TEXT NOT NULL,
  "status"                   "ApPaymentReversalStatus" NOT NULL DEFAULT 'PENDING_GERENCIA',
  "gerencia_reviewed_by_id"  TEXT,
  "gerencia_reviewed_at"     TIMESTAMP(3),
  "gerencia_rejection_notes" TEXT,
  "caja_reviewed_by_id"      TEXT,
  "caja_reviewed_at"         TIMESTAMP(3),
  "caja_rejection_notes"     TEXT,
  "payment_auth_request_id"  TEXT NOT NULL,
  "requested_by_id"          TEXT NOT NULL,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "account_payable_payment_reversal_requests_pkey" PRIMARY KEY ("id")
);

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS "account_payable_payment_reversal_requests_payment_auth_request_id_key"
  ON "account_payable_payment_reversal_requests"("payment_auth_request_id");

-- Indexes
CREATE INDEX IF NOT EXISTS "account_payable_payment_reversal_requests_status_idx"
  ON "account_payable_payment_reversal_requests"("status");

CREATE INDEX IF NOT EXISTS "account_payable_payment_reversal_requests_requested_by_id_idx"
  ON "account_payable_payment_reversal_requests"("requested_by_id");

-- Foreign keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_payable_payment_reversal_requests_payment_auth_request_id_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      ADD CONSTRAINT "account_payable_payment_reversal_requests_payment_auth_request_id_fkey"
      FOREIGN KEY ("payment_auth_request_id")
      REFERENCES "account_payable_payment_auth_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_payable_payment_reversal_requests_requested_by_id_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      ADD CONSTRAINT "account_payable_payment_reversal_requests_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_payable_payment_reversal_requests_gerencia_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      ADD CONSTRAINT "account_payable_payment_reversal_requests_gerencia_reviewed_by_id_fkey"
      FOREIGN KEY ("gerencia_reviewed_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_payable_payment_reversal_requests_caja_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      ADD CONSTRAINT "account_payable_payment_reversal_requests_caja_reviewed_by_id_fkey"
      FOREIGN KEY ("caja_reviewed_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
  END IF;
END $$;
