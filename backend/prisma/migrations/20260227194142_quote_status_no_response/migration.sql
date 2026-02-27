-- Migrate existing data: REJECTED and CANCELLED → NO_RESPONSE
UPDATE "quotes" SET "status" = 'NO_RESPONSE' WHERE "status" IN ('REJECTED', 'CANCELLED');

-- Recreate QuoteStatus enum without REJECTED/CANCELLED, with NO_RESPONSE
-- (PostgreSQL does not support ALTER TYPE REMOVE VALUE)
ALTER TYPE "QuoteStatus" RENAME TO "QuoteStatus_old";
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'NO_RESPONSE', 'CONVERTED');
ALTER TABLE "quotes" ALTER COLUMN "status" TYPE "QuoteStatus" USING "status"::text::"QuoteStatus";
DROP TYPE "QuoteStatus_old";
