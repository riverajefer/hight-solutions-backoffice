-- AlterTable
ALTER TABLE "quote_items" ADD COLUMN     "sample_image_id" TEXT;

-- CreateIndex
CREATE INDEX "quote_items_sample_image_id_idx" ON "quote_items"("sample_image_id");
