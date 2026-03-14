-- DropIndex
DROP INDEX "production_orders_work_order_id_key";

-- CreateIndex
CREATE INDEX "production_orders_work_order_id_idx" ON "production_orders"("work_order_id");
