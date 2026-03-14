-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "receipt_file_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_receipt_file_id_idx" ON "payments"("receipt_file_id");
