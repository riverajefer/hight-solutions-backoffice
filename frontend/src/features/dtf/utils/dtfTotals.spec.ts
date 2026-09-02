import { describe, expect, it } from 'vitest';
import { dtfIvaAmount, dtfPendingBalance, dtfTotalToCharge } from './dtfTotals';

describe('dtfTotalToCharge', () => {
  it('cobra el total redondeado, igual que la OP', () => {
    // 35.000 + 19% = 41.650 y la OP redondea a 41.700 (caso OP-2026-2532)
    expect(dtfTotalToCharge(35000, true)).toBe(41700);
    // 45.000 + 19% = 53.550 → 53.600 (caso OP-2026-2303)
    expect(dtfTotalToCharge(45000, true)).toBe(53600);
  });

  it('redondea también sin IVA', () => {
    expect(dtfTotalToCharge(11880, false)).toBe(11900);
    expect(dtfTotalToCharge(35000, false)).toBe(35000);
  });
});

describe('dtfIvaAmount', () => {
  it('absorbe el redondeo en el IVA para que base + IVA sea el total cobrado', () => {
    const base = 35000;
    expect(dtfIvaAmount(base, true)).toBe(6700);
    expect(base + dtfIvaAmount(base, true)).toBe(dtfTotalToCharge(base, true));
  });

  it('es cero cuando no aplica IVA', () => {
    expect(dtfIvaAmount(35000, false)).toBe(0);
  });
});

describe('dtfPendingBalance', () => {
  it('queda en cero cuando el abono cubre el total redondeado', () => {
    expect(dtfPendingBalance(35000, true, 41700)).toBe(0);
  });

  it('deja el residuo visible si se abona el valor sin redondear', () => {
    expect(dtfPendingBalance(35000, true, 41650)).toBe(50);
  });
});
