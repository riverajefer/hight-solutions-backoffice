import { startOfDay, endOfDay } from './date-range.util';

describe('date-range.util', () => {
  describe('startOfDay', () => {
    it('returns undefined when no date is provided', () => {
      expect(startOfDay(undefined)).toBeUndefined();
      expect(startOfDay('')).toBeUndefined();
    });

    it('expands a plain YYYY-MM-DD to start-of-day UTC', () => {
      expect(startOfDay('2026-07-01')?.toISOString()).toBe(
        '2026-07-01T00:00:00.000Z',
      );
    });

    it('respects a full ISO datetime as-is (frontend sends toISOString())', () => {
      const iso = '2026-06-15T05:00:00.000Z';
      expect(startOfDay(iso)?.toISOString()).toBe(iso);
    });

    it('returns undefined for an unparseable value instead of Invalid Date', () => {
      expect(startOfDay('not-a-date')).toBeUndefined();
    });
  });

  describe('endOfDay', () => {
    it('returns undefined when no date is provided', () => {
      expect(endOfDay(undefined)).toBeUndefined();
      expect(endOfDay('')).toBeUndefined();
    });

    it('expands a plain YYYY-MM-DD to end-of-day UTC', () => {
      expect(endOfDay('2026-07-01')?.toISOString()).toBe(
        '2026-07-01T23:59:59.999Z',
      );
    });

    it('respects a full ISO datetime as-is (frontend sends toISOString())', () => {
      const iso = '2026-07-16T04:59:59.999Z';
      expect(endOfDay(iso)?.toISOString()).toBe(iso);
    });

    it('returns undefined for an unparseable value instead of Invalid Date', () => {
      expect(endOfDay('not-a-date')).toBeUndefined();
    });
  });
});
