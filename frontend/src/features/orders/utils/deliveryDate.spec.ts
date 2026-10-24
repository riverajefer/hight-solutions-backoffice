import { describe, it, expect } from 'vitest';
import { getDeliveryDateError } from './deliveryDate';

describe('getDeliveryDateError', () => {
  it('exige la fecha', () => {
    expect(getDeliveryDateError(null)).toBe('La fecha y hora de entrega es obligatoria');
  });

  it('rechaza una fecha inválida', () => {
    expect(getDeliveryDateError(new Date('no-es-fecha'))).toBe(
      'La fecha y hora de entrega es obligatoria',
    );
  });

  it('rechaza una fecha que ya pasó', () => {
    expect(getDeliveryDateError(new Date(Date.now() - 60_000))).toBe(
      'La fecha y hora de entrega debe ser posterior a este momento',
    );
  });

  it('acepta una fecha futura', () => {
    expect(getDeliveryDateError(new Date(Date.now() + 60 * 60_000))).toBeNull();
  });
});
