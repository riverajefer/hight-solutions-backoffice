-- AlterTable: Add electronic_invoice_number field to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "electronic_invoice_number" VARCHAR(30);
