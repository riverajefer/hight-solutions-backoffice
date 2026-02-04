-- CreateTable
CREATE TABLE "order_item_production_areas" (
    "orderItemId" TEXT NOT NULL,
    "productionAreaId" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_production_areas_pkey" PRIMARY KEY ("orderItemId","productionAreaId")
);

-- AddForeignKey
ALTER TABLE "order_item_production_areas" ADD CONSTRAINT "order_item_production_areas_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_production_areas" ADD CONSTRAINT "order_item_production_areas_productionAreaId_fkey" FOREIGN KEY ("productionAreaId") REFERENCES "production_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
