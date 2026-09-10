-- Tipos de notificación del flujo de descuento por nómina.
--
-- Van en su propia migración porque PostgreSQL no permite usar un valor de enum
-- recién agregado dentro de la misma transacción en que se crea.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_DEDUCTION_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_DEDUCTION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_DEDUCTION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYROLL_DEDUCTION_APPLIED';
