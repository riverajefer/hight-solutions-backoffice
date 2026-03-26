-- Migration: Unify Area into ProductionArea
-- Cargos now belong to ProductionArea instead of the separate Area entity.

-- 1. Upsert org areas into production_areas (no-op if name already exists)
INSERT INTO "production_areas" ("id", "name", "description", "is_active", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  a."name",
  a."description",
  a."isActive",
  NOW(),
  NOW()
FROM "areas" a
ON CONFLICT ("name") DO NOTHING;

-- 2. Add nullable productionAreaId column to cargos
ALTER TABLE "cargos" ADD COLUMN "productionAreaId" TEXT;

-- 3. Backfill productionAreaId by matching area names
UPDATE "cargos" c
SET "productionAreaId" = pa."id"
FROM "areas" a
JOIN "production_areas" pa ON pa."name" = a."name"
WHERE c."areaId" = a."id";

-- 4. Make productionAreaId NOT NULL
ALTER TABLE "cargos" ALTER COLUMN "productionAreaId" SET NOT NULL;

-- 5. Drop old unique index and create new one
DROP INDEX "cargos_name_areaId_key";
CREATE UNIQUE INDEX "cargos_name_productionAreaId_key" ON "cargos"("name", "productionAreaId");

-- 6. Drop old FK constraint
ALTER TABLE "cargos" DROP CONSTRAINT "cargos_areaId_fkey";

-- 7. Add new FK constraint to production_areas
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_productionAreaId_fkey"
  FOREIGN KEY ("productionAreaId") REFERENCES "production_areas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Drop old areaId column
ALTER TABLE "cargos" DROP COLUMN "areaId";

-- 9. Drop areas table (no FK dependencies remain)
DROP TABLE "areas";
