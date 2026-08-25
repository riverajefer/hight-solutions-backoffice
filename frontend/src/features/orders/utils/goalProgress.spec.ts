import { describe, expect, it } from 'vitest';
import { computeGoalProgress, getGoalStatusColor } from './goalProgress';
import type { AdvisorBreakdown } from '../../../types/order.types';

const sales = (o: Partial<AdvisorBreakdown> = {}): AdvisorBreakdown => ({
  advisorId: 'a1',
  advisorName: 'Laura Maldonado',
  totalRevenue: 0,
  totalSubtotal: 0,
  totalDiscounts: 0,
  totalNetSubtotal: 1_000_000,
  totalOrders: 10,
  commissionableNetSubtotal: 250_000,
  commissionableOrders: 2,
  gapNetSubtotal: 600_000,
  gapOrders: 6,
  ...o,
});

describe('computeGoalProgress', () => {
  it('mide el avance sobre lo comisionable, no sobre el vendido', () => {
    const p = computeGoalProgress(sales(), 1_000_000);

    expect(p.commissionable).toBe(250_000);
    expect(p.sold).toBe(1_000_000);
    expect(p.pct).toBe(25);
    expect(p.diff).toBe(-750_000);
  });

  it('expone el vendido como segundo segmento de la barra', () => {
    const p = computeGoalProgress(
      sales({ commissionableNetSubtotal: 200_000, totalNetSubtotal: 800_000 }),
      1_000_000,
    );

    expect(p.pctCapped).toBe(20);
    expect(p.soldPctCapped).toBe(80);
  });

  it('recorta las barras al 100% pero deja el porcentaje real a la vista', () => {
    const p = computeGoalProgress(
      sales({ commissionableNetSubtotal: 1_500_000, totalNetSubtotal: 3_000_000 }),
      1_000_000,
    );

    expect(p.pct).toBe(150);
    expect(p.pctCapped).toBe(100);
    expect(p.soldPctCapped).toBe(100);
    expect(p.diff).toBe(500_000);
    expect(p.statusLabel).toBe('Superada');
  });

  it('con la meta en cero deja el avance en cero y no en Infinity', () => {
    const p = computeGoalProgress(sales(), 0);

    expect(p.pct).toBe(0);
    expect(p.soldPctCapped).toBe(0);
    expect(Number.isFinite(p.pct)).toBe(true);
  });

  it('sin datos del asesor todo queda en cero', () => {
    const p = computeGoalProgress(undefined, 1_000_000);

    expect(p).toMatchObject({ commissionable: 0, sold: 0, gapOrders: 0, gapAmount: 0, pct: 0 });
  });

  it('arrastra la brecha para poder mostrarla en la tarjeta', () => {
    const p = computeGoalProgress(sales({ gapOrders: 28, gapNetSubtotal: 4_000_000 }), 1_000_000);

    expect(p.gapOrders).toBe(28);
    expect(p.gapAmount).toBe(4_000_000);
  });
});

describe('getGoalStatusColor', () => {
  it('marca los tres tramos por porcentaje comisionable', () => {
    expect(getGoalStatusColor(0)).toBe('error');
    expect(getGoalStatusColor(69.9)).toBe('error');
    expect(getGoalStatusColor(70)).toBe('warning');
    expect(getGoalStatusColor(99.9)).toBe('warning');
    expect(getGoalStatusColor(100)).toBe('success');
    expect(getGoalStatusColor(150)).toBe('success');
  });
});
