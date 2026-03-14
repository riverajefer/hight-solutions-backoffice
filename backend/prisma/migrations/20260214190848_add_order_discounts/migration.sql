-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "order_discounts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_by_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_discounts_order_id_idx" ON "order_discounts"("order_id");

-- CreateIndex
CREATE INDEX "order_discounts_applied_by_id_idx" ON "order_discounts"("applied_by_id");

-- CreateIndex
CREATE INDEX "order_discounts_applied_at_idx" ON "order_discounts"("applied_at");

-- AddForeignKey
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
