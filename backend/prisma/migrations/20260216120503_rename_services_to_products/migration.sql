-- AlterTable: Rename service_categories table to product_categories
ALTER TABLE "service_categories" RENAME TO "product_categories";

-- AlterTable: Rename services table to products
ALTER TABLE "services" RENAME TO "products";

-- AlterTable: Rename service_id column to product_id in quote_items
ALTER TABLE "quote_items" RENAME COLUMN "service_id" TO "product_id";

-- AlterTable: Rename service_id column to product_id in order_items
ALTER TABLE "order_items" RENAME COLUMN "service_id" TO "product_id";

-- RenameForeignKey: Rename foreign key constraint in quote_items
ALTER TABLE "quote_items"
  DROP CONSTRAINT IF EXISTS "quote_items_service_id_fkey",
  ADD CONSTRAINT "quote_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameForeignKey: Rename foreign key constraint in order_items
ALTER TABLE "order_items"
  DROP CONSTRAINT IF EXISTS "order_items_service_id_fkey",
  ADD CONSTRAINT "order_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex: Rename indexes in quote_items
ALTER INDEX IF EXISTS "quote_items_service_id_idx" RENAME TO "quote_items_product_id_idx";

-- RenameIndex: Rename indexes in order_items
ALTER INDEX IF EXISTS "order_items_service_id_idx" RENAME TO "order_items_product_id_idx";
