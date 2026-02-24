-- CreateEnum
CREATE TYPE "ExpenseOrderStatus" AS ENUM ('DRAFT', 'CREATED', 'AUTHORIZED', 'PAID');

-- CreateTable
CREATE TABLE "expense_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expense_type_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_orders" (
    "id" TEXT NOT NULL,
    "og_number" TEXT NOT NULL,
    "expense_type_id" TEXT NOT NULL,
    "expense_subcategory_id" TEXT NOT NULL,
    "work_order_id" TEXT,
    "authorized_to_id" TEXT NOT NULL,
    "responsible_id" TEXT,
    "observations" TEXT,
    "area_or_machine" TEXT,
    "status" "ExpenseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_order_items" (
    "id" TEXT NOT NULL,
    "expense_order_id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "supplier_id" TEXT,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "receipt_file_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_order_item_production_areas" (
    "expenseOrderItemId" TEXT NOT NULL,
    "productionAreaId" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_order_item_production_areas_pkey" PRIMARY KEY ("expenseOrderItemId","productionAreaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_name_key" ON "expense_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_subcategories_name_expense_type_id_key" ON "expense_subcategories"("name", "expense_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_orders_og_number_key" ON "expense_orders"("og_number");

-- CreateIndex
CREATE INDEX "expense_orders_status_idx" ON "expense_orders"("status");

-- CreateIndex
CREATE INDEX "expense_orders_work_order_id_idx" ON "expense_orders"("work_order_id");

-- CreateIndex
CREATE INDEX "expense_orders_created_by_id_idx" ON "expense_orders"("created_by_id");

-- CreateIndex
CREATE INDEX "expense_orders_created_at_idx" ON "expense_orders"("created_at");

-- CreateIndex
CREATE INDEX "expense_order_items_expense_order_id_idx" ON "expense_order_items"("expense_order_id");

-- AddForeignKey
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_expense_subcategory_id_fkey" FOREIGN KEY ("expense_subcategory_id") REFERENCES "expense_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_authorized_to_id_fkey" FOREIGN KEY ("authorized_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_items" ADD CONSTRAINT "expense_order_items_expense_order_id_fkey" FOREIGN KEY ("expense_order_id") REFERENCES "expense_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_items" ADD CONSTRAINT "expense_order_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_item_production_areas" ADD CONSTRAINT "expense_order_item_production_areas_expenseOrderItemId_fkey" FOREIGN KEY ("expenseOrderItemId") REFERENCES "expense_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_order_item_production_areas" ADD CONSTRAINT "expense_order_item_production_areas_productionAreaId_fkey" FOREIGN KEY ("productionAreaId") REFERENCES "production_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
