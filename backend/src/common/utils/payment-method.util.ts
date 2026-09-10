import { PaymentMethod } from '../../generated/prisma';

/**
 * Métodos de pago que NO mueven dinero en caja.
 *
 * - `CREDIT_BALANCE` (saldo a favor): el ingreso ya se registró cuando el
 *   cliente sobrepagó la orden de origen. Volver a moverlo inflaría el arqueo.
 * - `CREDIT` (crédito): no es un abono, es la marca de "se entrega y el cliente
 *   paga después". No entra un peso, así que no puede generar movimiento —ni
 *   siquiera de $0, que solo ensucia el arqueo y quema consecutivos
 *   `CASH_RECEIPT`— ni quedar encolado como `pendingCashEntry`.
 * - `PAYROLL_DEDUCTION` (descuento por nómina): el cliente es un empleado y el
 *   trabajo se le resta del pago de la quincena. La empresa recupera el valor
 *   pagándole menos, no cobrándole: por caja no pasa nada, ni al pedirlo ni al
 *   descontarlo.
 */
const NON_CASH_METHODS: readonly PaymentMethod[] = [
  PaymentMethod.CREDIT_BALANCE,
  PaymentMethod.CREDIT,
  PaymentMethod.PAYROLL_DEDUCTION,
];

/**
 * Métodos que al *registrar la orden* no representan dinero recibido y por eso
 * exigen monto 0. El valor del trabajo queda como saldo pendiente de la OP.
 *
 * `PAYROLL_DEDUCTION` está acá por la misma razón que `CREDIT`: cuando el asesor
 * crea la OP el descuento todavía no ha ocurrido —falta que nómina lo apruebe y
 * lo aplique sobre un periodo—, así que darlo por cobrado deja la orden pagada
 * sin que la empresa haya recuperado nada. El abono con el monto real lo crea el
 * módulo `payroll-deductions` al aplicarlo, y ese sí lleva el valor completo.
 */
const ZERO_AMOUNT_ON_ORDER_METHODS: readonly PaymentMethod[] = [
  PaymentMethod.CREDIT,
  PaymentMethod.PAYROLL_DEDUCTION,
];

/** ¿Este método exige monto 0 al registrarse en la orden? */
export function requiresZeroAmountOnOrder(
  method: PaymentMethod | null | undefined,
): boolean {
  return method != null && ZERO_AMOUNT_ON_ORDER_METHODS.includes(method);
}

/** ¿Este pago debe generar un movimiento de caja? */
export function paymentMovesCash(
  method: PaymentMethod | null | undefined,
): boolean {
  return method != null && !NON_CASH_METHODS.includes(method);
}

/**
 * Motivo de anulación del movimiento de caja cuando un pago deja de ser dinero.
 * Queda visible en el arqueo y en la exportación de la sesión, así que debe
 * explicar por qué el ingreso desaparece.
 */
export function voidReasonForNonCash(
  method: PaymentMethod | null | undefined,
): string {
  switch (method) {
    case PaymentMethod.CREDIT:
      return (
        'El abono pasó a crédito: el crédito no registra dinero, el valor queda ' +
        'como saldo pendiente de la orden'
      );
    case PaymentMethod.PAYROLL_DEDUCTION:
      return (
        'El abono pasó a descuento por nómina: el valor se le resta al empleado ' +
        'en su liquidación, no entra por caja'
      );
    default:
      return 'El abono pasó a saldo a favor: el ingreso ya se registró en la OP de origen';
  }
}
