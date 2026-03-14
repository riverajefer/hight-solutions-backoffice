-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_date_changed_at" TIMESTAMP(3),
ADD COLUMN     "delivery_date_changed_by" TEXT,
ADD COLUMN     "delivery_date_reason" TEXT,
ADD COLUMN     "previous_delivery_date" TIMESTAMP(3);
