import { Prisma } from '../../generated/prisma';

type Num = Prisma.Decimal | number | string;
const D = (v: Num | null | undefined) => new Prisma.Decimal(v ?? 0);

/**
 * Datos de la OP que definen su venta. `discountAmount` se resta del total con
 * IVA (ver `recalculateOrderTotals`), así que para llevarlo a la base sin IVA
 * se divide por (1 + taxRate). La prueba de color se suma después del IVA: no
 * lo lleva.
 */
export interface OrderRevenueInput {
  subtotal: Num;
  discountAmount: Num;
  taxRate: Num;
  requiresColorProof: boolean;
  colorProofPrice: Num | null;
  total: Num;
  reversedAmount: Num;
}

/** Descuento expresado en la base sin IVA. */
function discountExVat(order: OrderRevenueInput): Prisma.Decimal {
  return D(order.discountAmount).div(D(1).add(D(order.taxRate)));
}

/**
 * Venta de la OP **sin IVA** (decisión del cliente, §9.7 del plan): subtotal de
 * los ítems, menos el descuento en base sin IVA, más la prueba de color.
 *
 * Las retenciones no restan: son anticipos de impuestos del cliente, no menos
 * venta. Lo anulado (`reversedAmount`, en base de total) se descuenta en la
 * misma proporción.
 */
export function computeOrderRevenueExVat(order: OrderRevenueInput): Prisma.Decimal {
  const colorProof = order.requiresColorProof ? D(order.colorProofPrice) : D(0);
  const base = D(order.subtotal).sub(discountExVat(order)).add(colorProof);
  const total = D(order.total);
  const netFactor = total.greaterThan(0)
    ? Prisma.Decimal.max(total.sub(D(order.reversedAmount)), 0).div(total)
    : D(1);
  return Prisma.Decimal.max(base.mul(netFactor), 0).toDecimalPlaces(2);
}

/**
 * Venta sin IVA atribuible a un ítem: su total menos las unidades anuladas, con
 * su parte del descuento de la OP (repartido en proporción al subtotal).
 */
export function computeItemRevenueExVat(
  item: { total: Num; unitPrice: Num; annulledQuantity: Num },
  order: Pick<OrderRevenueInput, 'subtotal' | 'discountAmount' | 'taxRate'>,
): Prisma.Decimal {
  const net = D(item.total).sub(D(item.annulledQuantity).mul(D(item.unitPrice)));
  const subtotal = D(order.subtotal);
  if (subtotal.lessThanOrEqualTo(0)) return D(0);
  const discountShare = discountExVat(order as OrderRevenueInput).div(subtotal);
  return Prisma.Decimal.max(net.mul(D(1).sub(discountShare)), 0).toDecimalPlaces(2);
}
