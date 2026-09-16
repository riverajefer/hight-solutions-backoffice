import {
  DEFAULT_WORKDAY_END,
  OVERTIME_CAP_CRON,
  parseWorkdayEnd,
  workdayEndCron,
} from './attendance-schedule.util';

describe('attendance-schedule.util', () => {
  describe('parseWorkdayEnd', () => {
    it('sin valor usa las 19:00', () => {
      expect(DEFAULT_WORKDAY_END).toBe('19:00');
      expect(parseWorkdayEnd(undefined)).toEqual({ hour: 19, minute: 0, label: '19:00', valid: true });
      expect(parseWorkdayEnd('  ')).toEqual({ hour: 19, minute: 0, label: '19:00', valid: true });
    });

    it('lee la hora configurada', () => {
      expect(parseWorkdayEnd('18:30')).toEqual({ hour: 18, minute: 30, label: '18:30', valid: true });
      expect(parseWorkdayEnd('7:05')).toEqual({ hour: 7, minute: 5, label: '07:05', valid: true });
    });

    // Un valor mal escrito no puede dejar la asistencia sin cierre.
    it.each(['25:00', '19', '19:60', 'siete'])('con "%s" usa las 19:00 y lo marca inválido', (value) => {
      expect(parseWorkdayEnd(value)).toEqual({ hour: 19, minute: 0, label: '19:00', valid: false });
    });
  });

  it('arma la expresión cron con segundos', () => {
    expect(workdayEndCron({ hour: 19, minute: 0 })).toBe('0 0 19 * * *');
    expect(workdayEndCron({ hour: 18, minute: 30 })).toBe('0 30 18 * * *');
    expect(OVERTIME_CAP_CRON).toBe('0 59 23 * * *');
  });
});
