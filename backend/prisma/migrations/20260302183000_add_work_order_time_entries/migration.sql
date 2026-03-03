-- CreateEnum
CREATE TYPE "WorkOrderTimeEntryType" AS ENUM ('HOURS', 'RANGE');

-- CreateTable
CREATE TABLE "work_order_time_entries" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "work_order_item_id" TEXT,
    "user_id" TEXT NOT NULL,
    "entry_type" "WorkOrderTimeEntryType" NOT NULL,
    "worked_date" TIMESTAMP(3) NOT NULL,
    "hours_worked" DECIMAL(65,30) NOT NULL,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_order_time_entries_work_order_id_idx" ON "work_order_time_entries"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_time_entries_work_order_item_id_idx" ON "work_order_time_entries"("work_order_item_id");

-- CreateIndex
CREATE INDEX "work_order_time_entries_user_id_idx" ON "work_order_time_entries"("user_id");

-- CreateIndex
CREATE INDEX "work_order_time_entries_worked_date_idx" ON "work_order_time_entries"("worked_date");

-- AddForeignKey
ALTER TABLE "work_order_time_entries" ADD CONSTRAINT "work_order_time_entries_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_time_entries" ADD CONSTRAINT "work_order_time_entries_work_order_item_id_fkey" FOREIGN KEY ("work_order_item_id") REFERENCES "work_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_time_entries" ADD CONSTRAINT "work_order_time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
