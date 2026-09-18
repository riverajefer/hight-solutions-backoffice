import { describe, it, expect } from 'vitest';
import {
  computeAvailableRefund,
  computeReversalNeededToFreeCash,
} from './refundAvailability';

describe('computeAvailableRefund', () => {
  it('devuelve el saldo a favor cuando no se anula venta', () => {
    // Orden de 100.000 con 120.000 abonados: sobran 20.000.
    expect(
      computeAvailableRefund({
        currentBalance: -20000,
        reversedAmount: 0,
        paidAmount: 120000,
      }),
    ).toBe(20000);
  });

  it('no libera nada si se anula justo lo que el cliente debe', () => {
    // Caso OP-2026-3290: total 120.000, abonado 60.000, debe 60.000.
    // Anular 60.000 deja la orden valiendo 60.000 y el abono la salda: $0.
    expect(
      computeAvailableRefund({
        currentBalance: 60000,
        reversedAmount: 60000,
        paidAmount: 60000,
      }),
    ).toBe(0);
  });

  it('libera el abono al anular la venta completa de una orden con deuda', () => {
    expect(
      computeAvailableRefund({
        currentBalance: 60000,
        reversedAmount: 120000,
        paidAmount: 60000,
      }),
    ).toBe(60000);
  });

  it('solo libera el excedente sobre la deuda en una anulación parcial', () => {
    // Debe 60.000 y se anulan 90.000: sobran 30.000.
    expect(
      computeAvailableRefund({
        currentBalance: 60000,
        reversedAmount: 90000,
        paidAmount: 60000,
      }),
    ).toBe(30000);
  });

  it('suma saldo a favor y venta anulada cuando la orden ya está sobrepagada', () => {
    expect(
      computeAvailableRefund({
        currentBalance: -20000,
        reversedAmount: 50000,
        paidAmount: 150000,
      }),
    ).toBe(70000);
  });

  it('nunca supera lo que el cliente abonó', () => {
    expect(
      computeAvailableRefund({
        currentBalance: 0,
        reversedAmount: 100000,
        paidAmount: 40000,
      }),
    ).toBe(40000);
  });

  it('no devuelve negativos', () => {
    expect(
      computeAvailableRefund({
        currentBalance: 80000,
        reversedAmount: 10000,
        paidAmount: 20000,
      }),
    ).toBe(0);
  });
});

describe('computeReversalNeededToFreeCash', () => {
  it('es la deuda viva cuando anular la venta completa alcanzaría', () => {
    expect(computeReversalNeededToFreeCash(60000, 120000)).toBe(60000);
  });

  it('es null cuando la orden no tiene deuda', () => {
    expect(computeReversalNeededToFreeCash(-20000, 100000)).toBeNull();
    expect(computeReversalNeededToFreeCash(0, 100000)).toBeNull();
  });

  it('es null cuando ni anulando todo quedaría dinero', () => {
    // Nada abonado: la deuda es la orden entera.
    expect(computeReversalNeededToFreeCash(120000, 120000)).toBeNull();
  });
});
