-- Migrate existing data from RETURNED to WARRANTY
UPDATE "orders" SET "status" = 'WARRANTY' WHERE "status" = 'RETURNED';
UPDATE "order_status_change_requests" SET "current_status" = 'WARRANTY' WHERE "current_status" = 'RETURNED';
UPDATE "order_status_change_requests" SET "requested_status" = 'WARRANTY' WHERE "requested_status" = 'RETURNED';
DELETE FROM "editable_order_statuses" WHERE "order_status" = 'RETURNED';

-- Recreate OrderStatus enum without RETURNED (PostgreSQL does not support ALTER TYPE REMOVE VALUE)
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'DELIVERED_ON_CREDIT', 'WARRANTY', 'PAID');
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";
ALTER TABLE "order_status_change_requests" ALTER COLUMN "current_status" TYPE "OrderStatus" USING "current_status"::text::"OrderStatus";
ALTER TABLE "order_status_change_requests" ALTER COLUMN "requested_status" TYPE "OrderStatus" USING "requested_status"::text::"OrderStatus";
ALTER TABLE "editable_order_statuses" ALTER COLUMN "order_status" TYPE "OrderStatus" USING "order_status"::text::"OrderStatus";
DROP TYPE "OrderStatus_old";
