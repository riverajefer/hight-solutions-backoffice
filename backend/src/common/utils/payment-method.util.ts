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
 */
const NON_CASH_METHODS: readonly PaymentMethod[] = [
  PaymentMethod.CREDIT_BALANCE,
  PaymentMethod.CREDIT,
];

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
  return method === PaymentMethod.CREDIT
    ? 'El abono pasó a crédito: el crédito no registra dinero, el valor queda ' +
        'como saldo pendiente de la orden'
    : 'El abono pasó a saldo a favor: el ingreso ya se registró en la OP de origen';
}
