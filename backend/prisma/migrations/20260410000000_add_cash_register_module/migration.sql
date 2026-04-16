-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DenominationCountType" AS ENUM ('OPENING', 'CLOSING');

-- CreateEnum
CREATE TYPE "DenominationType" AS ENUM ('BILL', 'COIN');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INCOME', 'EXPENSE', 'WITHDRAWAL', 'DEPOSIT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CASH_SESSION_CLOSED_WITH_DISCREPANCY';
ALTER TYPE "NotificationType" ADD VALUE 'CASH_LARGE_WITHDRAWAL';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "cash_movement_id" TEXT;

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "closed_by_id" TEXT,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_amount" DECIMAL(65,30) NOT NULL,
    "closing_amount" DECIMAL(65,30),
    "system_balance" DECIMAL(65,30),
    "discrepancy" DECIMAL(65,30),
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_denomination_counts" (
    "id" TEXT NOT NULL,
    "cash_session_id" TEXT NOT NULL,
    "count_type" "DenominationCountType" NOT NULL,
    "denom_type" "DenominationType" NOT NULL,
    "denomination" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "cash_denomination_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "cash_session_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "movement_type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "voided_by_id" TEXT,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "counter_movement_id" TEXT,
    "performed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_name_key" ON "cash_registers"("name");
CREATE INDEX "cash_sessions_cash_register_id_status_idx" ON "cash_sessions"("cash_register_id", "status");
CREATE INDEX "cash_sessions_opened_by_id_idx" ON "cash_sessions"("opened_by_id");
CREATE INDEX "cash_sessions_opened_at_idx" ON "cash_sessions"("opened_at");
CREATE INDEX "cash_denomination_counts_cash_session_id_count_type_idx" ON "cash_denomination_counts"("cash_session_id", "count_type");
CREATE UNIQUE INDEX "cash_denomination_counts_cash_session_id_count_type_denomin_key" ON "cash_denomination_counts"("cash_session_id", "count_type", "denomination");
CREATE UNIQUE INDEX "cash_movements_receipt_number_key" ON "cash_movements"("receipt_number");
CREATE UNIQUE INDEX "cash_movements_counter_movement_id_key" ON "cash_movements"("counter_movement_id");
CREATE INDEX "cash_movements_cash_session_id_idx" ON "cash_movements"("cash_session_id");
CREATE INDEX "cash_movements_performed_by_id_idx" ON "cash_movements"("performed_by_id");
CREATE INDEX "cash_movements_reference_type_reference_id_idx" ON "cash_movements"("reference_type", "reference_id");
CREATE INDEX "cash_movements_created_at_idx" ON "cash_movements"("created_at");
CREATE UNIQUE INDEX "payments_cash_movement_id_key" ON "payments"("cash_movement_id");

-- Partial unique index: only one OPEN session per register
CREATE UNIQUE INDEX "cash_sessions_one_open_per_register" ON "cash_sessions"("cash_register_id") WHERE status = 'OPEN';

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_movement_id_fkey" FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_denomination_counts" ADD CONSTRAINT "cash_denomination_counts_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_counter_movement_id_fkey" FOREIGN KEY ("counter_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
