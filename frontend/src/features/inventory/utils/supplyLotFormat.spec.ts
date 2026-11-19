import { describe, expect, it } from 'vitest';
import { isRollUnit, lotTerms } from './supplyLotFormat';

describe('lotTerms', () => {
  it('dice «rollo» cuando el insumo se mide en metros', () => {
    expect(lotTerms('m')).toMatchObject({ noun: 'rollo', Noun: 'Rollo', plural: 'rollos', initialLabel: 'Largo inicial', isRoll: true });
    expect(isRollUnit(' M ')).toBe(true);
  });

  it('dice «lote» para unidades, pliegos y metros cuadrados', () => {
    for (const unit of ['und', 'plg', 'm²', 'm2', 'L']) {
      expect(lotTerms(unit)).toMatchObject({ noun: 'lote', Noun: 'Lote', plural: 'lotes', initialLabel: 'Cantidad inicial', isRoll: false });
    }
  });

  it('dice «rollo o lote» cuando no se conoce la unidad', () => {
    expect(lotTerms(undefined).noun).toBe('rollo o lote');
    expect(lotTerms(null).plural).toBe('rollos o lotes');
  });
});
