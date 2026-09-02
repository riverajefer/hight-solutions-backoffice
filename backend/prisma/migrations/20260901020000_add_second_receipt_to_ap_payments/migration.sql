-- Segundo comprobante en pagos de Cuentas por Pagar.
--
-- La solicitud de pago de una CP solo admitía un archivo, pero en la práctica
-- el soporte viene partido en dos (la transferencia por un lado y la factura o
-- el recibo sellado por otro). Sin este campo el segundo archivo se adjuntaba
-- por WhatsApp o se perdía, y el pago quedaba registrado a medias.
--
-- Ambas columnas son opcionales: los pagos y solicitudes existentes quedan con
-- NULL y siguen mostrando un único comprobante.
--
-- Idempotente: IF NOT EXISTS en cada columna. Dev y staging comparten base.

ALTER TABLE "account_payable_payments" ADD COLUMN IF NOT EXISTS "receipt_file_id_2" TEXT;
ALTER TABLE "account_payable_payment_auth_requests" ADD COLUMN IF NOT EXISTS "receipt_file_id_2" TEXT;
