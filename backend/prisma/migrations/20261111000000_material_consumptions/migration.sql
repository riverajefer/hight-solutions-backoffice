-- CreateEnum
CREATE TYPE "MaterialConsumptionSource" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "supply_lots" ADD COLUMN     "waste_quantity" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "consumption_id" TEXT;

-- CreateTable
CREATE TABLE "product_supply_rules" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "factor" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "auto_consume" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_supply_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "supply_id" TEXT NOT NULL,
    "lot_id" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4),
    "total_cost" DECIMAL(14,2),
    "source" "MaterialConsumptionSource" NOT NULL DEFAULT 'AUTO',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_supply_rules_product_id_supply_id_key" ON "product_supply_rules"("product_id", "supply_id");

-- CreateIndex
CREATE INDEX "material_consumptions_order_id_idx" ON "material_consumptions"("order_id");

-- CreateIndex
CREATE INDEX "material_consumptions_order_item_id_idx" ON "material_consumptions"("order_item_id");

-- CreateIndex
CREATE INDEX "material_consumptions_lot_id_idx" ON "material_consumptions"("lot_id");

-- CreateIndex
CREATE INDEX "material_consumptions_supply_id_lot_id_idx" ON "material_consumptions"("supply_id", "lot_id");

-- AddForeignKey
ALTER TABLE "product_supply_rules" ADD CONSTRAINT "product_supply_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_supply_rules" ADD CONSTRAINT "product_supply_rules_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "supply_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_consumption_id_fkey" FOREIGN KEY ("consumption_id") REFERENCES "material_consumptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Un solo rollo montado por insumo (decisión del cliente, §9.2 del plan).
CREATE UNIQUE INDEX "supply_lots_one_in_use_per_supply" ON "supply_lots"("supply_id") WHERE "status" = 'IN_USE';

-- Un consumo vigente siempre tiene cantidad: cuando llega a cero se borra la fila.
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_waste_non_negative" CHECK ("waste_quantity" >= 0);
ALTER TABLE "product_supply_rules" ADD CONSTRAINT "product_supply_rules_factor_positive" CHECK ("factor" > 0);

-- Reglas DTF: 1 m vendido = 1 m de film. Por nombre recortado (en PRD el
-- producto se llama "DTF UV " con espacio al final). Idempotente y tolerante a
-- una base sin esos productos o insumos.
INSERT INTO "product_supply_rules" ("id", "product_id", "supply_id", "factor", "auto_consume", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p.id, s.id, 1, true, true, now(), now()
FROM (VALUES ('DTF UV', 'Rollo DTF UV'), ('DTF TEXTIL', 'Rollo DTF Textil')) AS v(product_name, supply_name)
JOIN "products" p ON upper(trim(p."name")) = v.product_name
JOIN "supplies" s ON s."name" = v.supply_name AND s."track_lots" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "product_supply_rules" r WHERE r."product_id" = p.id AND r."supply_id" = s.id
);
