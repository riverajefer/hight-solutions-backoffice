/**
 * Nombres de los métodos de pago, en un solo lugar.
 *
 * Hasta ahora cada pantalla llevaba su propio `Record<string, string>` con los
 * mismos cuatro o cinco métodos: veinte copias entre caja, cuentas por pagar,
 * órdenes y exportaciones. El problema no es la repetición, es que un método
 * nuevo no rompe nada: las copias que no se actualizan siguen compilando y lo
 * que sale impreso en el recibo o en el Excel es el código crudo
 * (`PAYROLL_DEDUCTION`), sin error en ningún lado.
 *
 * Cualquier pantalla que muestre un método debe usar `paymentMethodLabel()`.
 */

/** Todos los métodos que existen en la base (enum `PaymentMethod` de Prisma). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
  CREDIT_BALANCE: 'Saldo a favor',
  PAYROLL_DEDUCTION: 'Descuento por nómina',
};

/**
 * Nombre para mostrar de un método de pago.
 *
 * Ante un método desconocido devuelve el código tal cual en vez de una cadena
 * vacía: es feo, pero deja ver qué falta en vez de esconderlo.
 */
export function paymentMethodLabel(
  method: string | null | undefined,
): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/**
 * Métodos que no mueven dinero en caja. Espeja `NON_CASH_METHODS` del backend
 * (`common/utils/payment-method.util.ts`); si allá cambia, acá también.
 */
export const NON_CASH_PAYMENT_METHODS = [
  'CREDIT',
  'CREDIT_BALANCE',
  'PAYROLL_DEDUCTION',
] as const;

export function paymentMovesCash(method: string | null | undefined): boolean {
  return (
    method != null &&
    !NON_CASH_PAYMENT_METHODS.includes(
      method as (typeof NON_CASH_PAYMENT_METHODS)[number],
    )
  );
}

/**
 * Métodos que al registrarse en la orden exigen monto 0: el valor del trabajo
 * queda como saldo pendiente y el abono real llega después (o nunca, si es
 * crédito y el cliente paga aparte).
 */
export const ZERO_AMOUNT_PAYMENT_METHODS = [
  'CREDIT',
  'PAYROLL_DEDUCTION',
] as const;

export function requiresZeroAmount(
  method: string | null | undefined,
): boolean {
  return (
    method != null &&
    ZERO_AMOUNT_PAYMENT_METHODS.includes(
      method as (typeof ZERO_AMOUNT_PAYMENT_METHODS)[number],
    )
  );
}
