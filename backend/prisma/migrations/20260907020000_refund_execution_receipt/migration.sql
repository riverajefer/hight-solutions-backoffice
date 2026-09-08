-- Comprobante que adjunta Caja al pagar la devolución por transferencia.
--
-- `receipt_file_id` cubre el caso en que la transferencia ya se hizo y la
-- solicitud la documenta. Pero el flujo normal es al revés: quien hace la
-- transferencia es Caja, al ejecutar, y ese soporte no existía al momento de
-- solicitar. Con un solo campo, el segundo comprobante borraría al primero.
--
-- Es el mismo patrón de `account_payable_payments`, que ya guarda dos.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "refund_requests"
  ADD COLUMN IF NOT EXISTS "execution_receipt_file_id" TEXT;

CREATE INDEX IF NOT EXISTS "refund_requests_execution_receipt_file_id_idx"
  ON "refund_requests" ("execution_receipt_file_id");
