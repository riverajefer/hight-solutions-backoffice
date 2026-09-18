-- Alinea la base con `schema.prisma`: renombra dos objetos que quedaron con el
-- mismo nombre.
--
-- La migración que creó `account_payable_payment_reversal_requests` dejó la
-- llave foránea de `payment_auth_request_id` y su índice único con el mismo
-- nombre, truncado a los 63 caracteres de PostgreSQL. El motor lo permite
-- (constraints e índices viven en catálogos distintos), pero Prisma rechaza el
-- esquema: «has to be unique in the following namespace». Mientras estuvieran
-- así, `schema.prisma` no podía describir la base y cualquier
-- `prisma migrate dev` arrastraba el desajuste a la migración siguiente.
--
-- Se renombran a los nombres que Prisma genera por convención. Es un cambio de
-- nombres: no toca datos, no reescribe la tabla y no cambia el comportamiento.
--
-- Idempotente porque dev y staging comparten la misma base.

-- Llave foránea
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_payment_auth_request_'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_payment_auth_req_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      RENAME CONSTRAINT "account_payable_payment_reversal_requests_payment_auth_request_"
      TO "account_payable_payment_reversal_requests_payment_auth_req_fkey";
  END IF;
END $$;

-- Las otras dos llaves foráneas de la misma tabla quedaron truncadas en un
-- punto distinto al que usa Prisma, así que también se renombran.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_caja_reviewed_by_id_f'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_caja_reviewed_by_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      RENAME CONSTRAINT "account_payable_payment_reversal_requests_caja_reviewed_by_id_f"
      TO "account_payable_payment_reversal_requests_caja_reviewed_by_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_gerencia_reviewed_by_'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_payable_payment_reversal_requests_gerencia_reviewe_fkey'
  ) THEN
    ALTER TABLE "account_payable_payment_reversal_requests"
      RENAME CONSTRAINT "account_payable_payment_reversal_requests_gerencia_reviewed_by_"
      TO "account_payable_payment_reversal_requests_gerencia_reviewe_fkey";
  END IF;
END $$;

-- Índice único (conserva el nombre viejo hasta que la línea de arriba lo libera)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'account_payable_payment_reversal_requests_payment_auth_request_'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'account_payable_payment_reversal_requests_payment_auth_requ_key'
  ) THEN
    ALTER INDEX "account_payable_payment_reversal_requests_payment_auth_request_"
      RENAME TO "account_payable_payment_reversal_requests_payment_auth_requ_key";
  END IF;
END $$;
