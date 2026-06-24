-- Imagen adjunta a las observaciones de la orden
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "notes_image_id" TEXT;
