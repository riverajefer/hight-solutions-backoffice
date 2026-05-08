-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "attachment2_id" TEXT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_attachment2_id_fkey" FOREIGN KEY ("attachment2_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
