-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "attachment_id" TEXT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
