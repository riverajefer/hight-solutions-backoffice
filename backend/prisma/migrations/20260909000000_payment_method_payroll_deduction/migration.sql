-- Agrega el método de pago PAYROLL_DEDUCTION (descuento por nómina).
--
-- Va en su propia migración porque PostgreSQL no permite usar un valor de enum
-- recién agregado dentro de la misma transacción en que se crea, y la migración
-- que sigue sí lo necesita.
--
-- Es el tercer método que no mueve dinero en caja, junto a CREDIT y
-- CREDIT_BALANCE: la empresa no cobra el trabajo, lo recupera restándolo del
-- pago de la nómina del empleado.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYROLL_DEDUCTION' AFTER 'CREDIT_BALANCE';
