-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "color_proof_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "requires_color_proof" BOOLEAN NOT NULL DEFAULT false;
