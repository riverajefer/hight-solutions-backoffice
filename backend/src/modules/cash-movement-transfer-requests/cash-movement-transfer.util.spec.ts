import { Prisma } from '../../generated/prisma';
import {
  TRANSFER_MAX_DAYS,
  businessMonth,
  computeSourceClosingEffect,
  crossesMonth,
  signedCashEffect,
  transferIneligibilityReason,
} from './cash-movement-transfer.util';

const NOW = new Date('2026-11-04T15:00:00Z');

const movement = (overrides: Record<string, unknown> = {}) => ({
  movementType: 'EXPENSE' as const,
  paymentMethod: 'CASH',
  amount: new Prisma.Decimal(2000),
  isVoided: false,
  counterMovementId: null,
  isReversal: false,
  ...overrides,
});

const closedSession = (overrides: Record<string, unknown> = {}) => ({
  status: 'CLOSED',
  closedAt: new Date('2026-10-27T23:20:09Z'),
  closingAmount: new Prisma.Decimal(2780600),
  systemBalance: new Prisma.Decimal(2784462),
  discrepancy: new Prisma.Decimal(-3862),
  ...overrides,
});

describe('transferIneligibilityReason', () => {
  it('acepta un egreso en efectivo de una sesión cerrada hace menos de 30 días', () => {
    expect(transferIneligibilityReason(movement(), closedSession(), NOW)).toBeNull();
  });

  it('rechaza lo que no es efectivo', () => {
    expect(
      transferIneligibilityReason(movement({ paymentMethod: 'TRANSFER' }), closedSession(), NOW),
    ).toMatch(/efectivo/);
  });

  it('rechaza un movimiento anulado o la reversa de una anulación', () => {
    expect(transferIneligibilityReason(movement({ isVoided: true }), closedSession(), NOW)).toMatch(/anulado/);
    expect(
      transferIneligibilityReason(movement({ counterMovementId: 'x' }), closedSession(), NOW),
    ).toMatch(/anulado/);
    expect(transferIneligibilityReason(movement({ isReversal: true }), closedSession(), NOW)).toMatch(/reversa/);
  });

  it('rechaza un movimiento de una sesión abierta', () => {
    expect(
      transferIneligibilityReason(
        movement(),
        closedSession({ status: 'OPEN', closedAt: null, closingAmount: null, systemBalance: null }),
        NOW,
      ),
    ).toMatch(/sesión abierta/);
  });

  it(`rechaza una sesión cerrada hace más de ${TRANSFER_MAX_DAYS} días`, () => {
    const closedAt = new Date(NOW.getTime() - (TRANSFER_MAX_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(transferIneligibilityReason(movement(), closedSession({ closedAt }), NOW)).toMatch(/30 días/);
  });
});

describe('computeSourceClosingEffect', () => {
  it('OG-2026-0890: sacar un egreso de $2.000 sube el esperado y empeora el faltante', () => {
    const effect = computeSourceClosingEffect(closedSession(), movement());
    expect(effect.systemBalanceAfter.toNumber()).toBe(2786462);
    expect(effect.discrepancyAfter.toNumber()).toBe(-5862);
    expect(effect.worsens).toBe(true);
  });

  it('OG-2026-0917: sacar un egreso de $2.500 acerca el sobrante a cero', () => {
    const effect = computeSourceClosingEffect(
      {
        closingAmount: new Prisma.Decimal(3885550),
        systemBalance: new Prisma.Decimal(3882436),
        discrepancy: new Prisma.Decimal(3114),
      },
      movement({ amount: new Prisma.Decimal(2500) }),
    );
    expect(effect.systemBalanceAfter.toNumber()).toBe(3884936);
    expect(effect.discrepancyAfter.toNumber()).toBe(614);
    expect(effect.worsens).toBe(false);
  });

  it('sacar un ingreso registrado durante el arqueo baja el esperado y corrige el faltante falso', () => {
    const effect = computeSourceClosingEffect(
      {
        closingAmount: new Prisma.Decimal(1000000),
        systemBalance: new Prisma.Decimal(1492000),
        discrepancy: new Prisma.Decimal(-492000),
      },
      movement({ movementType: 'INCOME', amount: new Prisma.Decimal(492000) }),
    );
    expect(effect.systemBalanceAfter.toNumber()).toBe(1000000);
    expect(effect.discrepancyAfter.toNumber()).toBe(0);
  });

  it('parte del esperado guardado aunque falte la diferencia', () => {
    const effect = computeSourceClosingEffect(
      { closingAmount: 100, systemBalance: 90, discrepancy: null },
      movement({ amount: 10 }),
    );
    expect(effect.discrepancyBefore.toNumber()).toBe(10);
    expect(effect.discrepancyAfter.toNumber()).toBe(0);
  });
});

describe('signedCashEffect', () => {
  it('ingresos y depósitos suman; egresos y retiros restan', () => {
    expect(signedCashEffect({ movementType: 'INCOME', amount: 5 }).toNumber()).toBe(5);
    expect(signedCashEffect({ movementType: 'DEPOSIT', amount: 5 }).toNumber()).toBe(5);
    expect(signedCashEffect({ movementType: 'EXPENSE', amount: 5 }).toNumber()).toBe(-5);
    expect(signedCashEffect({ movementType: 'WITHDRAWAL', amount: 5 }).toNumber()).toBe(-5);
  });
});

describe('crossesMonth', () => {
  it('usa la hora de Colombia: el 31-oct a las 10 p. m. sigue siendo octubre', () => {
    const lateOctober = new Date('2026-11-01T03:00:00Z');
    expect(businessMonth(lateOctober)).toBe('2026-10');
    expect(crossesMonth(lateOctober, NOW)).toBe(true);
  });

  it('no advierte dentro del mismo mes', () => {
    expect(crossesMonth(new Date('2026-11-02T20:00:00Z'), NOW)).toBe(false);
  });
});
