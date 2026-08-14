import { Prisma } from '../../generated/prisma';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

const toDecimal = (value: DecimalLike): Prisma.Decimal =>
  value === null || value === undefined
    ? new Prisma.Decimal(0)
    : new Prisma.Decimal(value.toString());

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
