-- AlterTable
ALTER TABLE "supply_lots" ADD COLUMN     "expense_order_item_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "supply_lots_expense_order_item_id_key" ON "supply_lots"("expense_order_item_id");

-- AddForeignKey
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_expense_order_item_id_fkey" FOREIGN KEY ("expense_order_item_id") REFERENCES "expense_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

