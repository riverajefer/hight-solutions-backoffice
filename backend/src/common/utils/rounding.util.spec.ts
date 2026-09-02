import { Prisma } from '../../generated/prisma';
import {
  applyColombianRounding,
  computeDtfTotalToCharge,
  roundToWholePeso,
} from './rounding.util';

const dec = (v: string | number) => new Prisma.Decimal(v);

describe('applyColombianRounding', () => {
  it.each([
    ['41650', '41700'], // OP-2026-2532
    ['53550', '53600'], // OP-2026-2303
    ['29988', '30000'],
    ['11880', '11900'],
    ['41640', '41600'], // 40 → baja
    ['41641', '41700'], // 41 → sube
    ['41600', '41600'], // múltiplo exacto
  ])('redondea %s → %s', (input, expected) => {
    expect(applyColombianRounding(dec(input)).toString()).toBe(expected);
  });

  it('trunca los centavos antes de aplicar la regla', () => {
    expect(applyColombianRounding(dec('164755.50')).toString()).toBe('164800');
  });
});

describe('roundToWholePeso', () => {
  it('redondea half-up al peso entero', () => {
    expect(roundToWholePeso(dec('41650.50')).toString()).toBe('41651');
    expect(roundToWholePeso(dec('41650.49')).toString()).toBe('41650');
  });
});

describe('computeDtfTotalToCharge', () => {
  it('cobra el mismo total que tendrá la OP cuando aplica IVA', () => {
    // 35.000 + 19% = 41.650 → la OP lo redondea a 41.700; cobrar 41.650 dejaba
    // la orden con $50 de saldo que el cliente ya no debía.
    expect(computeDtfTotalToCharge(dec('35000'), true).toString()).toBe('41700');
  });

  it('redondea también cuando no aplica IVA', () => {
    expect(computeDtfTotalToCharge(dec('11880'), false).toString()).toBe('11900');
  });

  it('acepta el valor como número o string', () => {
    expect(computeDtfTotalToCharge(45000, true).toString()).toBe('53600');
    expect(computeDtfTotalToCharge('45000', true).toString()).toBe('53600');
  });
});
