-- Recreate QuoteStatus enum without REJECTED/CANCELLED, with NO_RESPONSE
-- (PostgreSQL does not support ALTER TYPE REMOVE VALUE)
ALTER TYPE "QuoteStatus" RENAME TO "QuoteStatus_old";
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'NO_RESPONSE', 'CONVERTED');
ALTER TABLE "quotes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quotes"
	ALTER COLUMN "status" TYPE "QuoteStatus"
	USING (
		CASE
			WHEN "status"::text IN ('REJECTED', 'CANCELLED') THEN 'NO_RESPONSE'
			ELSE "status"::text
		END
	)::"QuoteStatus";
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "QuoteStatus_old";
