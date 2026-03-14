-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "electronic_invoice_number" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "product_categories" RENAME CONSTRAINT "service_categories_pkey" TO "product_categories_pkey";

-- AlterTable
ALTER TABLE "products" RENAME CONSTRAINT "services_pkey" TO "products_pkey";

-- RenameForeignKey
ALTER TABLE "products" RENAME CONSTRAINT "services_category_id_fkey" TO "products_category_id_fkey";

-- RenameIndex
ALTER INDEX "service_categories_name_key" RENAME TO "product_categories_name_key";

-- RenameIndex
ALTER INDEX "service_categories_slug_key" RENAME TO "product_categories_slug_key";

-- RenameIndex
ALTER INDEX "services_name_category_id_key" RENAME TO "products_name_category_id_key";

-- RenameIndex
ALTER INDEX "services_slug_key" RENAME TO "products_slug_key";
