import { describe, it, expect } from 'vitest';
import {
  groupRecordsByDay,
  calculateBreaks,
  getDayStatus,
  formatDuration,
  formatDayLabel,
} from './attendance.utils';

const rec = (over: Record<string, any>) =>
  ({ clockIn: '', clockOut: null, totalMinutes: null, ...over } as any);

describe('attendance.utils', () => {
  describe('formatDuration', () => {
    it('devuelve 0m para valores no positivos', () => {
      expect(formatDuration(0)).toBe('0m');
      expect(formatDuration(-5)).toBe('0m');
    });

    it('solo minutos cuando es menos de una hora', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('solo horas cuando los minutos son exactos', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('horas y minutos', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });
  });

  describe('getDayStatus', () => {
    it('in_progress si hay un registro sin clockOut', () => {
      expect(getDayStatus([rec({ clockIn: 'x', clockOut: null })])).toBe('in_progress');
    });

    it('complete si todos los registros están cerrados', () => {
      expect(getDayStatus([rec({ clockIn: 'a', clockOut: 'b' })])).toBe('complete');
    });

    it('incomplete si no hay registros', () => {
      expect(getDayStatus([])).toBe('incomplete');
    });
  });

  describe('calculateBreaks', () => {
    it('calcula la pausa entre dos sesiones consecutivas', () => {
      const breaks = calculateBreaks([
        rec({ clockIn: '2026-03-24T08:00:00', clockOut: '2026-03-24T09:00:00' }),
        rec({ clockIn: '2026-03-24T09:30:00', clockOut: '2026-03-24T12:00:00' }),
      ]);
      expect(breaks).toHaveLength(1);
      expect(breaks[0].minutes).toBe(30);
    });

    it('no genera pausa si no hay gap', () => {
      const breaks = calculateBreaks([
        rec({ clockIn: '2026-03-24T08:00:00', clockOut: '2026-03-24T09:00:00' }),
        rec({ clockIn: '2026-03-24T09:00:00', clockOut: '2026-03-24T10:00:00' }),
      ]);
      expect(breaks).toHaveLength(0);
    });
  });

  describe('groupRecordsByDay', () => {
    it('agrupa por día, suma totales y pausas, y marca el estado', () => {
      const groups = groupRecordsByDay([
        rec({ clockIn: '2026-03-24T09:30:00', clockOut: '2026-03-24T12:00:00', totalMinutes: 150 }),
        rec({ clockIn: '2026-03-24T08:00:00', clockOut: '2026-03-24T09:00:00', totalMinutes: 60 }),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].date).toBe('2026-03-24');
      expect(groups[0].totalMinutes).toBe(210);
      expect(groups[0].breakMinutes).toBe(30);
      expect(groups[0].status).toBe('complete');
      // Ordenado ascendente por clockIn
      expect(groups[0].records[0].clockIn).toBe('2026-03-24T08:00:00');
    });

    it('ordena los días de más reciente a más antiguo', () => {
      const groups = groupRecordsByDay([
        rec({ clockIn: '2026-03-20T08:00:00', clockOut: '2026-03-20T09:00:00', totalMinutes: 60 }),
        rec({ clockIn: '2026-03-25T08:00:00', clockOut: '2026-03-25T09:00:00', totalMinutes: 60 }),
      ]);
      expect(groups.map((g) => g.date)).toEqual(['2026-03-25', '2026-03-20']);
    });
  });

  describe('formatDayLabel', () => {
    it('devuelve una etiqueta legible con el día del mes', () => {
      expect(formatDayLabel('2026-03-24')).toContain('24');
    });
  });
});
