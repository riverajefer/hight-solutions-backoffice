-- Add expense_type_id and expense_subcategory_id as nullable first
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "expense_type_id" TEXT;
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "expense_subcategory_id" TEXT;

-- Assign first available expense_type and expense_subcategory to existing rows that have NULL
UPDATE "accounts_payable"
SET
  "expense_type_id" = (SELECT id FROM "expense_types" ORDER BY "created_at" ASC LIMIT 1),
  "expense_subcategory_id" = (
    SELECT es.id FROM "expense_subcategories" es
    ORDER BY es."created_at" ASC LIMIT 1
  )
WHERE "expense_type_id" IS NULL;

-- Drop old type column if it still exists (from the previous enum)
ALTER TABLE "accounts_payable" DROP COLUMN IF EXISTS "type";

-- Now make the columns NOT NULL
ALTER TABLE "accounts_payable" ALTER COLUMN "expense_type_id" SET NOT NULL;
ALTER TABLE "accounts_payable" ALTER COLUMN "expense_subcategory_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_expense_type_id_fkey"
  FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_expense_subcategory_id_fkey"
  FOREIGN KEY ("expense_subcategory_id") REFERENCES "expense_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
