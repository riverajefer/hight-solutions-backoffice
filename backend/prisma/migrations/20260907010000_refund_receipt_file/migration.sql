-- Comprobante de la devolución hecha por transferencia.
--
-- Una devolución en efectivo se sustenta con el recibo de caja, pero una por
-- transferencia no deja rastro dentro del sistema: el soporte vive en la app del
-- banco. Sin adjuntarlo, la única prueba de que el dinero salió es la palabra de
-- quien lo envió.
--
-- Se guarda como el id suelto de un `UploadedFile`, igual que `payments.receipt_file_id`,
-- y no como llave foránea: es el patrón que ya sigue el resto de comprobantes.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "refund_requests"
  ADD COLUMN IF NOT EXISTS "receipt_file_id" TEXT;

CREATE INDEX IF NOT EXISTS "refund_requests_receipt_file_id_idx"
  ON "refund_requests" ("receipt_file_id");
