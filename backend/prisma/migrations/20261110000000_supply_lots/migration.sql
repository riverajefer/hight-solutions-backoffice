-- CreateEnum
CREATE TYPE "SupplyLotStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'DEPLETED', 'CLOSED', 'VOIDED');

-- AlterTable
ALTER TABLE "supplies" ADD COLUMN     "lot_prefix" TEXT,
ADD COLUMN     "low_stock_percent" DECIMAL(5,2),
ADD COLUMN     "track_lots" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "lot_id" TEXT;

-- CreateTable
CREATE TABLE "supply_lots" (
    "id" TEXT NOT NULL,
    "supply_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "initial_quantity" DECIMAL(14,4) NOT NULL,
    "remaining_quantity" DECIMAL(14,4) NOT NULL,
    "low_stock_quantity" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "total_cost" DECIMAL(14,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "status" "SupplyLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "depleted_at" TIMESTAMP(3),
    "notes" TEXT,
    "void_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supply_lots_code_key" ON "supply_lots"("code");

-- CreateIndex
CREATE INDEX "supply_lots_supply_id_status_idx" ON "supply_lots"("supply_id", "status");

-- CreateIndex
CREATE INDEX "supply_lots_received_at_idx" ON "supply_lots"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "supply_lots_supply_id_sequence_key" ON "supply_lots"("supply_id", "sequence");

-- CreateIndex
CREATE INDEX "inventory_movements_lot_id_idx" ON "inventory_movements"("lot_id");

-- AddForeignKey
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "supply_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Invariantes del lote: el saldo nunca es negativo y el lote nace con algo.
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_remaining_non_negative" CHECK ("remaining_quantity" >= 0);
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_initial_positive" CHECK ("initial_quantity" > 0);

-- Datos: categoría «DTF» y los dos insumos de rollo, controlados por lotes en
-- metros. Idempotente y tolerante a una base sin la unidad «m» (base nueva,
-- donde el seed corre después de las migraciones): en ese caso no inserta nada
-- y los insumos se crean desde la pantalla de Insumos.
INSERT INTO "supply_categories" ("id", "name", "slug", "description", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, 'DTF', 'dtf', 'Rollos de film DTF (UV y textil)', 0, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "supply_categories" WHERE "slug" = 'dtf' OR "name" = 'DTF');

INSERT INTO "supplies" ("id", "name", "description", "category_id", "purchase_unit_id", "consumption_unit_id",
                        "conversion_factor", "current_stock", "minimum_stock", "track_lots", "lot_prefix",
                        "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, v.name, v.description, c.id, u.id, u.id, 1, 0, 0, true, v.prefix, true, now(), now()
FROM (VALUES
  ('Rollo DTF UV', 'Film DTF UV; cada rollo se registra como lote', 'ROL-UV'),
  ('Rollo DTF Textil', 'Film DTF textil; cada rollo se registra como lote', 'ROL-TX')
) AS v(name, description, prefix)
JOIN "supply_categories" c ON c."slug" = 'dtf'
JOIN "units_of_measure" u ON u."abbreviation" = 'm'
WHERE NOT EXISTS (SELECT 1 FROM "supplies" s WHERE s."name" = v.name AND s."category_id" = c.id);
