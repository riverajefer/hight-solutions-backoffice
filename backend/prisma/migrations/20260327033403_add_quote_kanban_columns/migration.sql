-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "quote_kanban_columns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1976d2',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mapped_status" "QuoteStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_kanban_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_kanban_columns_mapped_status_key" ON "quote_kanban_columns"("mapped_status");
