import { computeItemRevenueExVat, computeOrderRevenueExVat } from './order-revenue.util';

const base = {
  subtotal: 100000,
  discountAmount: 0,
  taxRate: 0,
  requiresColorProof: false,
  colorProofPrice: null,
  total: 100000,
  reversedAmount: 0,
};

describe('order-revenue.util', () => {
  describe('computeOrderRevenueExVat', () => {
    it('sin IVA ni descuento es el subtotal', () => {
      expect(computeOrderRevenueExVat(base).toNumber()).toBe(100000);
    });

    it('con IVA la venta es el subtotal, no el total', () => {
      expect(computeOrderRevenueExVat({ ...base, taxRate: 0.19, total: 119000 }).toNumber()).toBe(100000);
    });

    it('el descuento (sobre el total con IVA) se lleva a base sin IVA', () => {
      const r = computeOrderRevenueExVat({ ...base, taxRate: 0.19, discountAmount: 11900, total: 107100 });
      expect(r.toNumber()).toBe(90000);
    });

    it('las retenciones no restan venta', () => {
      // total con retefuente 2,5 %: 97.500
      expect(computeOrderRevenueExVat({ ...base, total: 97500 }).toNumber()).toBe(100000);
    });

    it('suma la prueba de color solo si se pidió', () => {
      expect(computeOrderRevenueExVat({ ...base, colorProofPrice: 5000 }).toNumber()).toBe(100000);
      expect(
        computeOrderRevenueExVat({ ...base, requiresColorProof: true, colorProofPrice: 5000, total: 105000 }).toNumber(),
      ).toBe(105000);
    });

    it('descuenta lo anulado en proporción', () => {
      expect(computeOrderRevenueExVat({ ...base, reversedAmount: 25000 }).toNumber()).toBe(75000);
    });

    it('con total en cero no aplica proporción de anulado', () => {
      expect(computeOrderRevenueExVat({ ...base, subtotal: 0, total: 0 }).toNumber()).toBe(0);
    });
  });

  describe('computeItemRevenueExVat', () => {
    it('resta las unidades anuladas y reparte el descuento', () => {
      const r = computeItemRevenueExVat(
        { total: 70000, unitPrice: 70000, annulledQuantity: 0 },
        { subtotal: 100000, discountAmount: 10000, taxRate: 0 },
      );
      expect(r.toNumber()).toBe(63000);

      const annulled = computeItemRevenueExVat(
        { total: 40000, unitPrice: 10000, annulledQuantity: 1 },
        { subtotal: 40000, discountAmount: 0, taxRate: 0 },
      );
      expect(annulled.toNumber()).toBe(30000);
    });

    it('una OP sin subtotal no atribuye venta', () => {
      const r = computeItemRevenueExVat(
        { total: 0, unitPrice: 0, annulledQuantity: 0 },
        { subtotal: 0, discountAmount: 0, taxRate: 0 },
      );
      expect(r.toNumber()).toBe(0);
    });
  });
});
