-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
