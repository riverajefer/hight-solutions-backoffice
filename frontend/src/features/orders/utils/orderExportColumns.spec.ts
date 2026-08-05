import { describe, it, expect } from 'vitest';
import { ORDER_EXPORT_COLUMNS } from './orderExportColumns';
import type { Order } from '../../../types/order.types';

/** Orden mínima con solo los campos que usan las columnas financieras. */
const makeOrder = (fields: Partial<Order>): Order =>
  ({
    subtotal: '0',
    taxRate: '0',
    tax: '0',
    retefuenteRate: '0',
    reteICARate: '0',
    reteIVARate: '0',
    discountAmount: '0',
    requiresColorProof: false,
    colorProofPrice: '0',
    total: '0',
    ...fields,
  }) as Order;

const valueOf = (key: string, order: Order): number => {
  const col = ORDER_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!col) throw new Error(`columna desconocida: ${key}`);
  return col.getValue(order) as number;
};

/**
 * La identidad que el cliente debe poder reproducir sumando columnas en Excel:
 * Total = Subtotal − Retefuente − ReteICA + IVA − ReteIVA − Descuentos
 *         + Prueba de color + Ajuste redondeo
 */
const reconciles = (order: Order): boolean => {
  const suma =
    valueOf('subtotal', order) -
    valueOf('retefuenteAmount', order) -
    valueOf('reteICAAmount', order) +
    valueOf('tax', order) -
    valueOf('reteIVAAmount', order) -
    valueOf('discountAmount', order) +
    valueOf('colorProofPrice', order) +
    valueOf('roundingAdjustment', order);
  return Math.abs(suma - valueOf('total', order)) < 0.01;
};

describe('ORDER_EXPORT_COLUMNS — cuadre de Total', () => {
  it('cuadra en una orden sin IVA ni retenciones', () => {
    const order = makeOrder({ subtotal: '385000', total: '385000' });
    expect(reconciles(order)).toBe(true);
    expect(valueOf('roundingAdjustment', order)).toBe(0);
  });

  it('cuadra cuando el redondeo comercial baja el total', () => {
    // 34.000 -> 33.970 en el ejemplo que reportó el cliente.
    const order = makeOrder({ subtotal: '34000', total: '33970' });
    expect(reconciles(order)).toBe(true);
    expect(valueOf('roundingAdjustment', order)).toBe(-30);
  });

  it('cuadra con IVA del 19%', () => {
    const order = makeOrder({
      subtotal: '100000',
      taxRate: '0.19',
      tax: '19000',
      total: '119000',
    });
    expect(reconciles(order)).toBe(true);
    expect(valueOf('tax', order)).toBe(19000);
  });

  it('calcula los importes de retención a partir de las tasas', () => {
    const order = makeOrder({
      subtotal: '1000000',
      taxRate: '0.19',
      tax: '190000',
      retefuenteRate: '0.025',
      reteICARate: '0.00414',
      reteIVARate: '0.15',
      // 1.000.000 − 25.000 − 4.140 + 190.000 − 28.500 = 1.132.360
      total: '1132360',
    });

    expect(valueOf('retefuenteAmount', order)).toBe(25000);
    expect(valueOf('reteICAAmount', order)).toBe(4140);
    expect(valueOf('reteIVAAmount', order)).toBe(28500);
    // Con retenciones el backend no aplica redondeo comercial.
    expect(valueOf('roundingAdjustment', order)).toBe(0);
    expect(reconciles(order)).toBe(true);
  });

  it('cuadra con descuento y prueba de color', () => {
    const order = makeOrder({
      subtotal: '200000',
      discountAmount: '20000',
      requiresColorProof: true,
      colorProofPrice: '15000',
      total: '195000',
    });
    expect(valueOf('colorProofPrice', order)).toBe(15000);
    expect(reconciles(order)).toBe(true);
  });

  it('ignora el precio de prueba de color si la orden no la requiere', () => {
    const order = makeOrder({
      subtotal: '50000',
      requiresColorProof: false,
      colorProofPrice: '15000',
      total: '50000',
    });
    expect(valueOf('colorProofPrice', order)).toBe(0);
    expect(reconciles(order)).toBe(true);
  });
});
