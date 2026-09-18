/**
 * Dinero que una devolución puede sacar de la caja.
 *
 * Es la copia en la UI de `computeAvailableOverpayment` del backend
 * (`backend/src/common/utils/order-balance.util.ts`). Si las dos cuentas se
 * separan, el formulario propone montos que el servicio rechaza: fue
 * exactamente lo que pasó con la fórmula anterior (`maxAmount + reversedAmount`),
 * que ignoraba la deuda viva y ofrecía devolver el abono de una orden que
 * todavía se estaba debiendo.
 */
export interface RefundAvailabilityInput {
  /**
   * Saldo de la orden hoy: positivo = el cliente debe, negativo = saldo a favor.
   */
  currentBalance: number;
  /** Valor de venta que la devolución anula. 0 en una devolución de saldo a favor. */
  reversedAmount: number;
  /** Abono neto del cliente: nada puede salir de la caja por encima de esto. */
  paidAmount: number;
}

/**
 * Anular venta baja lo que la orden vale, así que lo que le sobra al cliente
 * después de la anulación es `reversedAmount - currentBalance`.
 *
 * Con la orden ya en saldo a favor equivale a "saldo a favor + lo anulado". Con
 * deuda viva, la anulación primero cubre esa deuda y solo el excedente se
 * devuelve: por eso anular justo lo que se debe libera $0.
 */
export const computeAvailableRefund = ({
  currentBalance,
  reversedAmount,
  paidAmount,
}: RefundAvailabilityInput): number =>
  Math.min(Math.max(0, reversedAmount - currentBalance), Math.max(0, paidAmount));

/**
 * Cuánta venta hay que anular para que empiece a sobrar dinero: la deuda viva.
 *
 * `null` cuando la orden no tiene deuda (cualquier anulación libera) o cuando ni
 * anulando la venta completa alcanzaría (no hay devolución posible).
 */
export const computeReversalNeededToFreeCash = (
  currentBalance: number,
  pendingSaleValue: number,
): number | null =>
  currentBalance > 0 && currentBalance < pendingSaleValue ? currentBalance : null;
