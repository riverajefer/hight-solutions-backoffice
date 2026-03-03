-- Staging recovery for failed migration:
-- 20260227013507_remove_returned_status_enforce_flow
--
-- Purpose:
-- - Normalize legacy RETURNED values to WARRANTY
-- - Repair partial enum migration states safely
-- - Leave schema aligned with Prisma schema (OrderStatus without RETURNED)

BEGIN;

UPDATE "orders"
SET "status" = 'WARRANTY'
WHERE "status"::text = 'RETURNED';

UPDATE "order_status_change_requests"
SET "current_status" = 'WARRANTY'
WHERE "current_status"::text = 'RETURNED';

UPDATE "order_status_change_requests"
SET "requested_status" = 'WARRANTY'
WHERE "requested_status"::text = 'RETURNED';

DELETE FROM "editable_order_statuses"
WHERE "order_status"::text = 'RETURNED';

DO $$
DECLARE
  has_returned_in_order_status BOOLEAN;
  has_order_status_old BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'RETURNED'
  ) INTO has_returned_in_order_status;

  SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'OrderStatus_old'
  ) INTO has_order_status_old;

  IF has_returned_in_order_status THEN
    EXECUTE 'ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old"';
    has_order_status_old := TRUE;
  END IF;

  IF has_order_status_old AND NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'OrderStatus'
  ) THEN
    EXECUTE 'CREATE TYPE "OrderStatus" AS ENUM (''DRAFT'', ''CONFIRMED'', ''IN_PRODUCTION'', ''READY'', ''DELIVERED'', ''DELIVERED_ON_CREDIT'', ''WARRANTY'', ''PAID'')';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'status'
      AND udt_name <> 'OrderStatus'
  ) THEN
    EXECUTE 'ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_status_change_requests'
      AND column_name = 'current_status'
      AND udt_name <> 'OrderStatus'
  ) THEN
    EXECUTE 'ALTER TABLE "order_status_change_requests" ALTER COLUMN "current_status" TYPE "OrderStatus" USING "current_status"::text::"OrderStatus"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_status_change_requests'
      AND column_name = 'requested_status'
      AND udt_name <> 'OrderStatus'
  ) THEN
    EXECUTE 'ALTER TABLE "order_status_change_requests" ALTER COLUMN "requested_status" TYPE "OrderStatus" USING "requested_status"::text::"OrderStatus"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'editable_order_statuses'
      AND column_name = 'order_status'
      AND udt_name <> 'OrderStatus'
  ) THEN
    EXECUTE 'ALTER TABLE "editable_order_statuses" ALTER COLUMN "order_status" TYPE "OrderStatus" USING "order_status"::text::"OrderStatus"';
  END IF;
END
$$;

DROP TYPE IF EXISTS "OrderStatus_old";

COMMIT;