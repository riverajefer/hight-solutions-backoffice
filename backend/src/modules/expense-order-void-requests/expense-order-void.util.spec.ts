import { Prisma } from '../../generated/prisma';
import {
  VOID_MAX_DAYS_SINCE_CLOSE,
  computeClosingEffectOfVoid,
  movementApplyIssue,
  movementVoidBlocker,
} from './expense-order-void.util';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-20T23:00:00Z');

const closedSession = (overrides: Record<string, unknown> = {}) => ({
  status: 'CLOSED',
  closedAt: new Date(now.getTime() - 2 * DAY),
  countStartedAt: null,
  closingAmount: new Prisma.Decimal(2_789_749),
  systemBalance: new Prisma.Decimal(2_680_164),
  discrepancy: new Prisma.Decimal(109_585),
  ...overrides,
});

describe('movementVoidBlocker', () => {
  const m = { receiptNumber: 'RC-2026-7780' };

  it('deja anular en una sesión abierta', () => {
    expect(movementVoidBlocker(m, closedSession({ status: 'OPEN', closedAt: null }), now)).toBeNull();
  });

  it('deja anular en una sesión cerrada dentro del plazo', () => {
    expect(movementVoidBlocker(m, closedSession(), now)).toBeNull();
  });

  it(`bloquea una sesión cerrada hace más de ${VOID_MAX_DAYS_SINCE_CLOSE} días`, () => {
    const old = closedSession({ closedAt: new Date(now.getTime() - (VOID_MAX_DAYS_SINCE_CLOSE + 1) * DAY) });
    expect(movementVoidBlocker(m, old, now)).toMatch(/más de 30 días/);
  });

  it('bloquea una sesión cerrada sin cierre registrado', () => {
    expect(movementVoidBlocker(m, closedSession({ systemBalance: null }), now)).toMatch(/sin cierre/);
  });
});

describe('movementApplyIssue', () => {
  it('frena un egreso en efectivo si su caja está en arqueo', () => {
    expect(
      movementApplyIssue(
        { receiptNumber: 'RC-1', paymentMethod: 'CASH' },
        { status: 'OPEN', countStartedAt: new Date() },
      ),
    ).toMatch(/arqueo/);
  });

  it('no frena una transferencia aunque la caja esté en arqueo', () => {
    expect(
      movementApplyIssue(
        { receiptNumber: 'RC-1', paymentMethod: 'TRANSFER' },
        { status: 'OPEN', countStartedAt: new Date() },
      ),
    ).toBeNull();
  });
});

describe('computeClosingEffectOfVoid', () => {
  it('anular un egreso en efectivo sube lo esperado y borra el sobrante de ese día', () => {
    const effect = computeClosingEffectOfVoid(closedSession(), [
      { movementType: 'EXPENSE', paymentMethod: 'CASH', amount: 109_585 },
    ]);
    expect(effect.systemBalanceAfter.toString()).toBe('2789749');
    expect(effect.discrepancyBefore.toString()).toBe('109585');
    expect(effect.discrepancyAfter.toString()).toBe('0');
    expect(effect.worsens).toBe(false);
  });

  it('ignora los movimientos que no son en efectivo', () => {
    const effect = computeClosingEffectOfVoid(closedSession(), [
      { movementType: 'EXPENSE', paymentMethod: 'TRANSFER', amount: 50_000 },
    ]);
    expect(effect.systemBalanceAfter.equals(effect.systemBalanceBefore)).toBe(true);
  });

  it('marca que empeora si el cierre cuadraba y el dinero sí salió', () => {
    const effect = computeClosingEffectOfVoid(
      closedSession({ closingAmount: 2_680_164, discrepancy: 0 }),
      [{ movementType: 'EXPENSE', paymentMethod: 'CASH', amount: 109_585 }],
    );
    expect(effect.discrepancyAfter.toString()).toBe('-109585');
    expect(effect.worsens).toBe(true);
  });
});
