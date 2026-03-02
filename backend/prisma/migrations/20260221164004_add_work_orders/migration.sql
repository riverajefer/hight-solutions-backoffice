-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "work_order_number" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "designer_id" TEXT,
    "file_name" TEXT,
    "observations" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_items" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "product_description" TEXT NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_item_production_areas" (
    "workOrderItemId" TEXT NOT NULL,
    "productionAreaId" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_item_production_areas_pkey" PRIMARY KEY ("workOrderItemId","productionAreaId")
);

-- CreateTable
CREATE TABLE "work_order_item_supplies" (
    "id" TEXT NOT NULL,
    "work_order_item_id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_item_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_work_order_number_key" ON "work_orders"("work_order_number");

-- CreateIndex
CREATE INDEX "work_orders_order_id_idx" ON "work_orders"("order_id");

-- CreateIndex
CREATE INDEX "work_orders_advisor_id_idx" ON "work_orders"("advisor_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_order_items_work_order_id_idx" ON "work_order_items"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_items_order_item_id_idx" ON "work_order_items"("order_item_id");

-- CreateIndex
CREATE INDEX "work_order_item_supplies_work_order_item_id_idx" ON "work_order_item_supplies"("work_order_item_id");

-- CreateIndex
CREATE INDEX "work_order_item_supplies_supply_id_idx" ON "work_order_item_supplies"("supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_item_supplies_work_order_item_id_supply_id_key" ON "work_order_item_supplies"("work_order_item_id", "supply_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_item_production_areas" ADD CONSTRAINT "work_order_item_production_areas_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "work_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_item_production_areas" ADD CONSTRAINT "work_order_item_production_areas_productionAreaId_fkey" FOREIGN KEY ("productionAreaId") REFERENCES "production_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_item_supplies" ADD CONSTRAINT "work_order_item_supplies_work_order_item_id_fkey" FOREIGN KEY ("work_order_item_id") REFERENCES "work_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_item_supplies" ADD CONSTRAINT "work_order_item_supplies_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
