import { describe, it, expect } from 'vitest';
import { getPendingAdvanceInfo } from './pendingAdvance';
import type { Order } from '../../../types/order.types';

const buildOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    total: '80000',
    paidAmount: '100000',
    balance: '-20000',
    payments: [],
    advancePaymentApprovals: [],
    advancePaymentStatus: null,
    ...overrides,
  }) as unknown as Order;

describe('getPendingAdvanceInfo', () => {
  it('reporta saldo a favor cuando lo pagado supera el total', () => {
    const info = getPendingAdvanceInfo(buildOrder());

    expect(info.effectiveBalance).toBe(-20000);
    expect(info.hasPendingAdvance).toBe(false);
  });

  it('no cuenta como saldo a favor el excedente ya aplicado a otras órdenes', () => {
    const info = getPendingAdvanceInfo(
      buildOrder({ appliedCreditAmount: '20000', balance: '0' }),
    );

    expect(info.effectiveBalance).toBe(0);
  });

  it('deja disponible solo la parte del excedente no aplicada', () => {
    // total 70.000, pagado 100.000 → 30.000 de excedente, 20.000 ya gastados
    const info = getPendingAdvanceInfo(
      buildOrder({
        total: '70000',
        appliedCreditAmount: '20000',
        balance: '-10000',
      }),
    );

    expect(info.effectiveBalance).toBe(-10000);
  });

  it('no descuenta los abonos pendientes de aprobación de Caja', () => {
    const info = getPendingAdvanceInfo(
      buildOrder({
        total: '100000',
        paidAmount: '40000',
        payments: [{ id: 'pay-1', amount: '40000' }],
        advancePaymentApprovals: [
          { status: 'PENDING', paymentId: 'pay-1' },
        ],
      } as unknown as Partial<Order>),
    );

    expect(info.hasPendingAdvance).toBe(true);
    expect(info.pendingAmount).toBe(40000);
    expect(info.effectiveBalance).toBe(100000);
  });
});
