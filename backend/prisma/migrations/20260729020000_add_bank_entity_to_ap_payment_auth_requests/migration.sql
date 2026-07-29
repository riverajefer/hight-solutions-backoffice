-- Entidad bancaria de origen en la solicitud de pago de cuentas por pagar (doble firma).
-- Idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "account_payable_payment_auth_requests" ADD COLUMN IF NOT EXISTS "bank_entity" TEXT;
