-- CreateEnum
CREATE TYPE "DtfStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'EN_IMPRESION', 'COMPLETADA', 'CONVERTIDA_EN_OP');

-- CreateTable
CREATE TABLE "dtf_records" (
    "id" TEXT NOT NULL,
    "consecutive" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "status" "DtfStatus" NOT NULL DEFAULT 'BORRADOR',
    "order_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dtf_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dtf_status_history" (
    "id" TEXT NOT NULL,
    "dtf_id" TEXT NOT NULL,
    "from_status" "DtfStatus",
    "to_status" "DtfStatus" NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dtf_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dtf_records_consecutive_key" ON "dtf_records"("consecutive");

-- CreateIndex
CREATE INDEX "dtf_records_client_id_idx" ON "dtf_records"("client_id");

-- CreateIndex
CREATE INDEX "dtf_records_product_id_idx" ON "dtf_records"("product_id");

-- CreateIndex
CREATE INDEX "dtf_records_status_idx" ON "dtf_records"("status");

-- CreateIndex
CREATE INDEX "dtf_records_created_by_id_idx" ON "dtf_records"("created_by_id");

-- CreateIndex
CREATE INDEX "dtf_status_history_dtf_id_idx" ON "dtf_status_history"("dtf_id");

-- AddForeignKey
ALTER TABLE "dtf_records" ADD CONSTRAINT "dtf_records_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtf_records" ADD CONSTRAINT "dtf_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtf_records" ADD CONSTRAINT "dtf_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtf_records" ADD CONSTRAINT "dtf_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtf_status_history" ADD CONSTRAINT "dtf_status_history_dtf_id_fkey" FOREIGN KEY ("dtf_id") REFERENCES "dtf_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dtf_status_history" ADD CONSTRAINT "dtf_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
