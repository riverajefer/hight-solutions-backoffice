-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('BIWEEKLY', 'MONTHLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "recurring_frequency" "RecurringFrequency";

-- DropEnum
DROP TYPE "AccountPayableType";
