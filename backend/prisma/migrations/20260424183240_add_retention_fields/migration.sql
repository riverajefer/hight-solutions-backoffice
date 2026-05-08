-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "rete_ica_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "rete_iva_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "retefuente_rate" DECIMAL(65,30) NOT NULL DEFAULT 0;
