-- AlterTable: Add electronic_invoice_number field to expense_orders
ALTER TABLE "expense_orders" ADD COLUMN IF NOT EXISTS "electronic_invoice_number" VARCHAR(30);
