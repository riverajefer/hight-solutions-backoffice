import { Prisma } from '../../generated/prisma';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

const toDecimal = (value: DecimalLike): Prisma.Decimal =>
  value === null || value === undefined
    ? new Prisma.Decimal(0)
    : new Prisma.Decimal(value.toString());

/**
 * Filtro canónico de los pagos que cuentan como dinero de la orden.
 *
 * Un pago anulado sobrevive en la tabla para que el Historial de Pagos pueda
 * mostrar qué pasó y quién lo autorizó, pero no es dinero: no suma a
 * `paidAmount` ni a los reportes. Úsalo en TODO `where` que sume pagos; si se
 * olvida en uno solo, la plata anulada reaparece como saldo a favor.
 */
export const ACTIVE_PAYMENT_WHERE = { isVoided: false } as const;

/**
 * Suma los pagos que siguen vivos, descartando los anulados.
 *
 * Recibe la lista completa a propósito: así el llamador puede traerse los pagos
 * una sola vez para mostrarlos (anulados incluidos) y sumar solo los vivos.
 */
export function sumActivePayments(
  payments: { amount: DecimalLike; isVoided?: boolean }[],
): Prisma.Decimal {
  return payments.reduce(
    (sum, payment) =>
      payment.isVoided ? sum : sum.add(toDecimal(payment.amount)),
    new Prisma.Decimal(0),
  );
}

/**
 * Abono neto de una orden a partir de sus pagos.
 *
 * Los `Payment` no se borran al aprobar una devolución: el dinero devuelto se
 * descuenta de `paidAmount`. Por eso, cada vez que `paidAmount` se recalcula
 * sumando los pagos hay que volver a restar lo devuelto, o el dinero que ya salió
 * de la caja reaparece como saldo a favor disponible.
 *
 * paidAmount = suma(pagos) - refundedAmount
 */
export function computeNetPaidAmount(
  paymentsTotal: DecimalLike,
  refundedAmount: DecimalLike = 0,
): Prisma.Decimal {
  const net = toDecimal(paymentsTotal).sub(toDecimal(refundedAmount));
  return net.lessThan(0) ? new Prisma.Decimal(0) : net;
}

/**
 * Saldo pendiente de una orden.
 *
 * `appliedCreditAmount` es la parte del excedente de esta orden que ya se aplicó
 * como pago de otras órdenes: al sumarla, ese saldo deja de figurar como saldo a
 * favor y no puede volver a gastarse ni devolverse.
 *
 * balance = total - paidAmount + appliedCreditAmount
 */
export function computeOrderBalance(
  total: DecimalLike,
  paidAmount: DecimalLike,
  appliedCreditAmount: DecimalLike = 0,
): Prisma.Decimal {
  return toDecimal(total).sub(toDecimal(paidAmount)).add(toDecimal(appliedCreditAmount));
}

/**
 * Saldo a favor disponible de una orden (0 si no hay excedente).
 * Es el inverso del balance cuando este es negativo.
 */
export function computeAvailableOverpayment(
  total: DecimalLike,
  paidAmount: DecimalLike,
  appliedCreditAmount: DecimalLike = 0,
): Prisma.Decimal {
  const balance = computeOrderBalance(total, paidAmount, appliedCreditAmount);
  return balance.lessThan(0) ? balance.negated() : new Prisma.Decimal(0);
}
