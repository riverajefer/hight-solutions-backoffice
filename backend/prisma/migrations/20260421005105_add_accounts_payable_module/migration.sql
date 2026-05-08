-- CreateEnum
CREATE TYPE "AccountPayableStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountPayableType" AS ENUM ('RENT', 'PUBLIC_SERVICES', 'BANK_CREDIT', 'SUPPLIER', 'THIRD_PARTY_SERVICE', 'PAYROLL', 'TAX', 'MAINTENANCE', 'SUBSCRIPTION', 'TRANSPORT', 'OTHER');

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "ap_number" TEXT NOT NULL,
    "type" "AccountPayableType" NOT NULL,
    "status" "AccountPayableStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "observations" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_day" INTEGER,
    "supplier_id" TEXT,
    "expense_order_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" TEXT,
    "cancel_reason" TEXT,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payable_payments" (
    "id" TEXT NOT NULL,
    "account_payable_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "cash_movement_id" TEXT,
    "registered_by_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payable_attachments" (
    "id" TEXT NOT NULL,
    "account_payable_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_payable_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_ap_number_key" ON "accounts_payable"("ap_number");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_expense_order_id_key" ON "accounts_payable"("expense_order_id");

-- CreateIndex
CREATE INDEX "accounts_payable_status_idx" ON "accounts_payable"("status");

-- CreateIndex
CREATE INDEX "accounts_payable_due_date_idx" ON "accounts_payable"("due_date");

-- CreateIndex
CREATE INDEX "accounts_payable_supplier_id_idx" ON "accounts_payable"("supplier_id");

-- CreateIndex
CREATE INDEX "accounts_payable_created_by_id_idx" ON "accounts_payable"("created_by_id");

-- CreateIndex
CREATE INDEX "accounts_payable_created_at_idx" ON "accounts_payable"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_payable_payments_cash_movement_id_key" ON "account_payable_payments"("cash_movement_id");

-- CreateIndex
CREATE INDEX "account_payable_payments_account_payable_id_idx" ON "account_payable_payments"("account_payable_id");

-- CreateIndex
CREATE INDEX "account_payable_payments_payment_date_idx" ON "account_payable_payments"("payment_date");

-- CreateIndex
CREATE INDEX "account_payable_attachments_account_payable_id_idx" ON "account_payable_attachments"("account_payable_id");

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_expense_order_id_fkey" FOREIGN KEY ("expense_order_id") REFERENCES "expense_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payments" ADD CONSTRAINT "account_payable_payments_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payments" ADD CONSTRAINT "account_payable_payments_cash_movement_id_fkey" FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_payments" ADD CONSTRAINT "account_payable_payments_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_attachments" ADD CONSTRAINT "account_payable_attachments_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_attachments" ADD CONSTRAINT "account_payable_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
