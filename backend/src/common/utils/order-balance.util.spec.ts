import {
  computeAvailableOverpayment,
  computeNetPaidAmount,
  computeOrderBalance,
} from './order-balance.util';

const n = (value: { toString(): string }) => Number(value.toString());

describe('order-balance.util', () => {
  describe('computeOrderBalance', () => {
    it('resta lo abonado al total', () => {
      expect(n(computeOrderBalance(100000, 40000))).toBe(60000);
    });

    it('deja el saldo negativo cuando hay sobrepago', () => {
      expect(n(computeOrderBalance(80000, 100000))).toBe(-20000);
    });

    it('neutraliza el excedente ya aplicado a otras órdenes', () => {
      expect(n(computeOrderBalance(80000, 100000, 20000))).toBe(0);
    });

    it('deja pendiente lo que el cliente debe cuando el total sube tras gastar el saldo', () => {
      // El excedente de 20.000 ya se gastó; luego el total subió a 95.000
      expect(n(computeOrderBalance(95000, 100000, 20000))).toBe(15000);
    });

    it('trata null/undefined como cero', () => {
      expect(n(computeOrderBalance(100000, null, undefined))).toBe(100000);
    });
  });

  describe('computeNetPaidAmount', () => {
    it('devuelve la suma de pagos cuando no hubo devoluciones', () => {
      expect(n(computeNetPaidAmount(100000))).toBe(100000);
    });

    it('descuenta lo ya devuelto al cliente', () => {
      expect(n(computeNetPaidAmount(100000, 20000))).toBe(80000);
    });

    it('nunca devuelve un abono negativo', () => {
      expect(n(computeNetPaidAmount(10000, 50000))).toBe(0);
    });
  });

  describe('computeAvailableOverpayment', () => {
    it('es cero cuando la orden no está sobrepagada', () => {
      expect(n(computeAvailableOverpayment(100000, 60000))).toBe(0);
    });

    it('expone el excedente disponible', () => {
      expect(n(computeAvailableOverpayment(80000, 100000))).toBe(20000);
    });

    it('no cuenta el excedente ya aplicado a otras órdenes', () => {
      expect(n(computeAvailableOverpayment(80000, 100000, 20000))).toBe(0);
    });
  });

  describe('escenario completo: devolución seguida de edición de ítems', () => {
    it('no resucita el dinero ya devuelto al recalcular desde los pagos', () => {
      // OP de 80.000 con 100.000 en pagos → 20.000 a favor, devueltos en efectivo.
      const paymentsTotal = 100000;
      const refunded = 20000;

      const paidAfterRefund = computeNetPaidAmount(paymentsTotal, refunded);
      expect(n(paidAfterRefund)).toBe(80000);
      expect(n(computeOrderBalance(80000, paidAfterRefund))).toBe(0);

      // Ahora se editan los ítems y baja el total a 70.000: el recálculo vuelve a
      // sumar los pagos, pero sigue restando lo devuelto.
      const paidAfterEdit = computeNetPaidAmount(paymentsTotal, refunded);
      expect(n(paidAfterEdit)).toBe(80000);
      // Saldo a favor real: 10.000, no los 30.000 que saldrían ignorando la devolución
      expect(n(computeAvailableOverpayment(70000, paidAfterEdit))).toBe(10000);
    });
  });
});
