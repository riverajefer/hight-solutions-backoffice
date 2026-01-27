-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL,
    "price_unit" TEXT,
    "category_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_category_id_key" ON "services"("name", "category_id");
