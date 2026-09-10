import { describe, expect, it } from 'vitest';
import {
  PAYMENT_METHOD_LABELS,
  paymentMethodLabel,
  paymentMovesCash,
  requiresZeroAmount,
} from './paymentMethods';

/**
 * Este catálogo reemplazó veinte copias del mismo `Record<string, string>`
 * repartidas por caja, cuentas por pagar y órdenes. El riesgo que cubre es el
 * silencioso: un método sin nombre no rompe nada, solo imprime el código crudo
 * en un recibo o en un Excel.
 */
describe('paymentMethodLabel', () => {
  it('cubre todos los métodos que existen en la base', () => {
    // Espeja el enum `PaymentMethod` de Prisma. Si allá se agrega uno y acá no,
    // esta prueba falla antes de que salga impreso en un recibo.
    const metodosEnLaBase = [
      'CASH',
      'TRANSFER',
      'CARD',
      'CHECK',
      'CREDIT',
      'OTHER',
      'CREDIT_BALANCE',
      'PAYROLL_DEDUCTION',
    ];

    for (const metodo of metodosEnLaBase) {
      expect(PAYMENT_METHOD_LABELS[metodo]).toBeDefined();
      expect(paymentMethodLabel(metodo)).not.toBe(metodo);
    }
  });

  it('nombra el descuento por nómina', () => {
    expect(paymentMethodLabel('PAYROLL_DEDUCTION')).toBe('Descuento por nómina');
  });

  it('devuelve un guion cuando no hay método', () => {
    expect(paymentMethodLabel(null)).toBe('—');
    expect(paymentMethodLabel(undefined)).toBe('—');
    expect(paymentMethodLabel('')).toBe('—');
  });

  // Feo a propósito: deja ver qué falta en vez de esconderlo tras una cadena
  // vacía que nadie relaciona con un método sin nombre.
  it('devuelve el código crudo ante un método desconocido', () => {
    expect(paymentMethodLabel('BITCOIN')).toBe('BITCOIN');
  });
});

describe('paymentMovesCash', () => {
  it.each(['CASH', 'TRANSFER', 'CARD', 'CHECK', 'OTHER'])(
    '%s mueve caja',
    (metodo) => {
      expect(paymentMovesCash(metodo)).toBe(true);
    },
  );

  it.each(['CREDIT', 'CREDIT_BALANCE', 'PAYROLL_DEDUCTION'])(
    '%s no mueve caja',
    (metodo) => {
      expect(paymentMovesCash(metodo)).toBe(false);
    },
  );
});

describe('requiresZeroAmount', () => {
  // Al crear la OP el descuento todavía no ocurrió: el abono con el valor real
  // lo genera nómina al aplicarlo sobre la quincena.
  it.each(['CREDIT', 'PAYROLL_DEDUCTION'])('%s exige monto 0', (metodo) => {
    expect(requiresZeroAmount(metodo)).toBe(true);
  });

  // El saldo a favor sí es dinero que ya entró en la OP de origen.
  it.each(['CASH', 'TRANSFER', 'CARD', 'CREDIT_BALANCE'])(
    '%s se registra con su monto',
    (metodo) => {
      expect(requiresZeroAmount(metodo)).toBe(false);
    },
  );
});
