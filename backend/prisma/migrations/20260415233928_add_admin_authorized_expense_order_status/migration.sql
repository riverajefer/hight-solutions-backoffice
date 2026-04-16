-- AlterEnum
ALTER TYPE "ExpenseOrderStatus" ADD VALUE 'ADMIN_AUTHORIZED';

-- AlterTable
ALTER TABLE "expense_orders" ADD COLUMN     "caja_authorized_at" TIMESTAMP(3),
ADD COLUMN     "caja_authorized_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "expense_orders" ADD CONSTRAINT "expense_orders_caja_authorized_by_id_fkey" FOREIGN KEY ("caja_authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
