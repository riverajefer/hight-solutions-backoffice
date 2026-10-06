import { describe, expect, it } from 'vitest';
import { getDaysToDelivery, getDeliveryLabel, getSemaphore } from './deliverySemaphore';

// Mediodía local: lejos de la medianoche para que la zona horaria no mueva el día.
const today = new Date(2026, 9, 5, 12, 0, 0);
const localDate = (day: number, hour = 12) => new Date(2026, 9, day, hour, 0, 0).toISOString();

describe('getDaysToDelivery', () => {
  it('devuelve null cuando no hay fecha o es inválida', () => {
    expect(getDaysToDelivery(null, today)).toBeNull();
    expect(getDaysToDelivery('no-es-fecha', today)).toBeNull();
  });

  it('cuenta días calendario sin importar la hora', () => {
    expect(getDaysToDelivery(localDate(5, 1), today)).toBe(0);
    expect(getDaysToDelivery(localDate(5, 23), today)).toBe(0);
    expect(getDaysToDelivery(localDate(6, 0), today)).toBe(1);
    expect(getDaysToDelivery(localDate(4, 23), today)).toBe(-1);
  });
});

describe('getSemaphore', () => {
  it('gris cuando la orden no tiene fecha', () => {
    expect(getSemaphore(null, today)).toBe('no-date');
  });

  it('rojo cuando la fecha ya pasó', () => {
    expect(getSemaphore(localDate(4), today)).toBe('overdue');
    expect(getSemaphore(localDate(1), today)).toBe('overdue');
  });

  it('amarillo cuando la entrega es hoy o mañana', () => {
    expect(getSemaphore(localDate(5), today)).toBe('warning');
    expect(getSemaphore(localDate(6), today)).toBe('warning');
  });

  it('verde cuando faltan más días que el umbral', () => {
    expect(getSemaphore(localDate(7), today)).toBe('on-time');
  });

  it('respeta un umbral distinto', () => {
    expect(getSemaphore(localDate(8), today, 3)).toBe('warning');
    expect(getSemaphore(localDate(6), today, 0)).toBe('on-time');
  });
});

describe('getDeliveryLabel', () => {
  it('describe la distancia a la entrega', () => {
    expect(getDeliveryLabel(null, today)).toBe('Sin fecha');
    expect(getDeliveryLabel(localDate(3), today)).toBe('Vencida hace 2 d');
    expect(getDeliveryLabel(localDate(5), today)).toBe('Hoy');
    expect(getDeliveryLabel(localDate(6), today)).toBe('Mañana');
    expect(getDeliveryLabel(localDate(10), today)).toBe('En 5 d');
  });
});
