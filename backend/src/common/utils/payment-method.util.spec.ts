import { PaymentMethod } from '../../generated/prisma';
import {
  paymentMovesCash,
  requiresZeroAmountOnOrder,
  voidReasonForNonCash,
} from './payment-method.util';

/**
 * Esta utilidad es la fuente única de verdad de "¿este pago mueve dinero?".
 * Si un método que no mueve caja se cuela como que sí, cada abono le inventa un
 * ingreso al arqueo y quema un consecutivo `CASH_RECEIPT` que nadie pidió.
 */
describe('payment-method.util', () => {
  describe('paymentMovesCash', () => {
    it.each([PaymentMethod.CASH, PaymentMethod.TRANSFER, PaymentMethod.CARD, PaymentMethod.CHECK])(
      '%s mueve caja',
      (method) => {
        expect(paymentMovesCash(method)).toBe(true);
      },
    );

    it.each([
      PaymentMethod.CREDIT,
      PaymentMethod.CREDIT_BALANCE,
      PaymentMethod.PAYROLL_DEDUCTION,
    ])('%s no mueve caja', (method) => {
      expect(paymentMovesCash(method)).toBe(false);
    });

    // El descuento por nómina no entra a caja ni siquiera cuando se aplica: la
    // empresa recupera el trabajo pagándole menos al empleado, no cobrándole.
    it('el descuento por nómina no mueve caja tampoco con monto real', () => {
      expect(paymentMovesCash(PaymentMethod.PAYROLL_DEDUCTION)).toBe(false);
    });

    it('un método nulo no mueve caja', () => {
      expect(paymentMovesCash(null)).toBe(false);
      expect(paymentMovesCash(undefined)).toBe(false);
    });
  });

  describe('requiresZeroAmountOnOrder', () => {
    // Al crear la OP el descuento todavía no ocurrió: el abono con el valor
    // real lo genera el módulo de descuentos al aplicarlo sobre la nómina.
    it.each([PaymentMethod.CREDIT, PaymentMethod.PAYROLL_DEDUCTION])(
      '%s exige monto 0 en la orden',
      (method) => {
        expect(requiresZeroAmountOnOrder(method)).toBe(true);
      },
    );

    // El saldo a favor sí es dinero: ya entró cuando el cliente sobrepagó la
    // orden de origen, así que se registra con su monto.
    it.each([PaymentMethod.CASH, PaymentMethod.TRANSFER, PaymentMethod.CREDIT_BALANCE])(
      '%s se registra con su monto',
      (method) => {
        expect(requiresZeroAmountOnOrder(method)).toBe(false);
      },
    );
  });

  describe('voidReasonForNonCash', () => {
    it('explica cada método con su propio motivo', () => {
      expect(voidReasonForNonCash(PaymentMethod.CREDIT)).toContain('crédito');
      expect(voidReasonForNonCash(PaymentMethod.PAYROLL_DEDUCTION)).toContain(
        'nómina',
      );
      expect(voidReasonForNonCash(PaymentMethod.CREDIT_BALANCE)).toContain(
        'saldo a favor',
      );
    });

    // El motivo queda visible en el arqueo y en la exportación de la sesión, así
    // que no puede salir vacío para ningún método.
    it('nunca devuelve un texto vacío', () => {
      for (const method of Object.values(PaymentMethod)) {
        expect(voidReasonForNonCash(method).length).toBeGreaterThan(0);
      }
    });
  });
});
