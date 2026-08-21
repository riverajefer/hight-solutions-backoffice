import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getDaysSince,
} from './orderFormatters';

describe('orderFormatters', () => {
  afterEach(() => vi.useRealTimers());

  describe('formatCurrency', () => {
    it('formatea un decimal string como COP sin decimales', () => {
      expect(formatCurrency('150000').replace(/\s| /g, '')).toContain('150.000');
    });

    it('acepta números', () => {
      expect(formatCurrency(2500).replace(/\s| /g, '')).toContain('2.500');
    });

    it('usa 0 para valores no finitos', () => {
      expect(formatCurrency('abc')).toContain('0');
    });
  });

  describe('formatDate / formatDateTime', () => {
    it('formatea una fecha ISO incluyendo el año', () => {
      expect(formatDate('2026-01-15T10:30:00')).toContain('2026');
      expect(formatDateTime('2026-01-15T10:30:00')).toContain('2026');
    });
  });

  describe('getDaysSince', () => {
    it('devuelve 0 para la fecha de hoy', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0));
      expect(getDaysSince(new Date(2026, 5, 15, 8, 0, 0).toISOString())).toBe(0);
    });

    it('cuenta los días transcurridos', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0));
      expect(getDaysSince(new Date(2026, 5, 5, 8, 0, 0).toISOString())).toBe(10);
    });

    it('nunca devuelve negativos para fechas futuras', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0));
      expect(getDaysSince(new Date(2026, 5, 20, 8, 0, 0).toISOString())).toBe(0);
    });
  });
});
