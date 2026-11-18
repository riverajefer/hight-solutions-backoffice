-- AlterTable
ALTER TABLE "material_consumptions" ADD COLUMN     "factor" DECIMAL(12,4);

-- AlterTable
ALTER TABLE "product_supply_rules" ADD COLUMN     "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "material_overrides" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_overrides_supply_id_idx" ON "material_overrides"("supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_overrides_order_item_id_supply_id_key" ON "material_overrides"("order_item_id", "supply_id");

-- AddForeignKey
ALTER TABLE "material_overrides" ADD CONSTRAINT "material_overrides_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_overrides" ADD CONSTRAINT "material_overrides_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_overrides" ADD CONSTRAINT "material_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Una corrección puede ser 0 (material del cliente), nunca negativa.
ALTER TABLE "material_overrides" ADD CONSTRAINT "material_overrides_quantity_non_negative" CHECK ("quantity" >= 0);

-- Las reglas que ya existían rigen desde que se crearon, no desde hoy.
UPDATE "product_supply_rules" SET "effective_from" = "created_at";

-- Las correcciones manuales que ya existían pasan a la tabla nueva con la
-- cantidad que tienen hoy, para que la sincronización las siga respetando.
INSERT INTO "material_overrides" ("id", "order_item_id", "supply_id", "quantity", "created_by_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text, c."order_item_id", c."supply_id", sum(c."quantity"),
       (array_agg(c."created_by_id" ORDER BY c."created_at"))[1], min(c."created_at"), now()
FROM "material_consumptions" c
WHERE c."source" = 'MANUAL' AND c."order_item_id" IS NOT NULL
GROUP BY c."order_item_id", c."supply_id"
ON CONFLICT ("order_item_id", "supply_id") DO NOTHING;
