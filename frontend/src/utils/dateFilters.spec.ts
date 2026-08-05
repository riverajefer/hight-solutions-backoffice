import { describe, it, expect } from 'vitest';
import {
  toDateFilter,
  toDateFilterOrUndefined,
  parseDateFilter,
} from './dateFilters';

describe('dateFilters', () => {
  describe('toDateFilter', () => {
    it('usa el día del calendario local, no el UTC', () => {
      // 01/07 a las 00:00 local. En Colombia (UTC-5) eso es 05:00Z del 01/07,
      // pero lo importante es que el día enviado sea el que el usuario eligió.
      expect(toDateFilter(new Date(2026, 6, 1, 0, 0, 0))).toBe('2026-07-01');
    });

    it('no adelanta el día para una fecha de fin de mes por la noche', () => {
      expect(toDateFilter(new Date(2026, 6, 31, 20, 30, 0))).toBe('2026-07-31');
    });

    it('rellena mes y día con ceros', () => {
      expect(toDateFilter(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
  });

  describe('toDateFilterOrUndefined', () => {
    it('devuelve undefined cuando el DatePicker está vacío', () => {
      expect(toDateFilterOrUndefined(null)).toBeUndefined();
      expect(toDateFilterOrUndefined(undefined)).toBeUndefined();
    });

    it('formatea igual que toDateFilter cuando hay fecha', () => {
      expect(toDateFilterOrUndefined(new Date(2026, 6, 1))).toBe('2026-07-01');
    });
  });

  describe('parseDateFilter', () => {
    it('devuelve el mismo día que se guardó (sin corrimiento de zona)', () => {
      const parsed = parseDateFilter('2026-07-01')!;
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(6);
      expect(parsed.getDate()).toBe(1);
    });

    it('es la inversa exacta de toDateFilter', () => {
      const value = '2026-07-01';
      expect(toDateFilter(parseDateFilter(value)!)).toBe(value);
    });

    it('tolera un ISO completo quedándose con la parte de fecha', () => {
      expect(toDateFilter(parseDateFilter('2026-07-01T05:00:00.000Z')!)).toBe(
        '2026-07-01',
      );
    });

    it('devuelve undefined para valores vacíos o inválidos', () => {
      expect(parseDateFilter(undefined)).toBeUndefined();
      expect(parseDateFilter('')).toBeUndefined();
      expect(parseDateFilter('no-es-fecha')).toBeUndefined();
    });
  });
});
