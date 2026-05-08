-- CreateTable
CREATE TABLE "account_payable_installments" (
    "id" TEXT NOT NULL,
    "account_payable_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "paid_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_payable_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_payable_installments_account_payable_id_idx" ON "account_payable_installments"("account_payable_id");

-- AddForeignKey
ALTER TABLE "account_payable_installments" ADD CONSTRAINT "account_payable_installments_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_payable_installments" ADD CONSTRAINT "account_payable_installments_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
