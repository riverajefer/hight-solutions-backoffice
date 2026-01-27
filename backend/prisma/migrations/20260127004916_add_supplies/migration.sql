-- CreateTable
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "category_id" TEXT NOT NULL,
    "purchase_price" DECIMAL,
    "purchase_unit_id" TEXT NOT NULL,
    "consumption_unit_id" TEXT NOT NULL,
    "conversion_factor" DECIMAL NOT NULL DEFAULT 1,
    "current_stock" DECIMAL NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "supplies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "supply_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "supplies_purchase_unit_id_fkey" FOREIGN KEY ("purchase_unit_id") REFERENCES "units_of_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "supplies_consumption_unit_id_fkey" FOREIGN KEY ("consumption_unit_id") REFERENCES "units_of_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "supplies_sku_key" ON "supplies"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "supplies_name_category_id_key" ON "supplies"("name", "category_id");
