import { AttendanceRecord, AttendanceBreak, DayGroup, DayStatus } from '../../../types';

/**
 * Agrupa registros de asistencia por día y calcula breaks, totales y estado.
 */
export function groupRecordsByDay(records: AttendanceRecord[]): DayGroup[] {
  const dayMap = new Map<string, AttendanceRecord[]>();

  for (const record of records) {
    const dateKey = record.clockIn.slice(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(dateKey) || [];
    existing.push(record);
    dayMap.set(dateKey, existing);
  }

  const groups: DayGroup[] = [];

  for (const [date, dayRecords] of dayMap) {
    // Sort by clockIn ascending
    const sorted = [...dayRecords].sort(
      (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
    );

    const breaks = calculateBreaks(sorted);
    const breakMinutes = breaks.reduce((sum, b) => sum + b.minutes, 0);

    const now = new Date();
    let totalMinutes = 0;
    for (const r of sorted) {
      if (r.totalMinutes != null) {
        totalMinutes += r.totalMinutes;
      } else if (r.clockIn && !r.clockOut) {
        totalMinutes += Math.floor((now.getTime() - new Date(r.clockIn).getTime()) / 60000);
      }
    }

    const status = getDayStatus(sorted);

    groups.push({ date, records: sorted, totalMinutes, breakMinutes, breaks, status });
  }

  // Sort days descending (most recent first)
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return groups;
}

/**
 * Calcula las pausas (gaps) entre sesiones consecutivas del mismo día.
 */
export function calculateBreaks(sortedRecords: AttendanceRecord[]): AttendanceBreak[] {
  const breaks: AttendanceBreak[] = [];

  for (let i = 0; i < sortedRecords.length - 1; i++) {
    const current = sortedRecords[i];
    const next = sortedRecords[i + 1];

    if (current.clockOut && next.clockIn) {
      const end = new Date(next.clockIn).getTime();
      const start = new Date(current.clockOut).getTime();
      const gapMinutes = Math.floor((end - start) / 60000);

      if (gapMinutes > 0) {
        breaks.push({
          start: current.clockOut,
          end: next.clockIn,
          minutes: gapMinutes,
        });
      }
    }
  }

  return breaks;
}

/**
 * Determina el estado de un día basado en sus registros.
 */
export function getDayStatus(records: AttendanceRecord[]): DayStatus {
  const hasActiveRecord = records.some((r) => !r.clockOut);
  if (hasActiveRecord) return 'in_progress';

  // All records closed — check if all have clockOut
  const allClosed = records.every((r) => r.clockOut);
  if (allClosed && records.length > 0) return 'complete';

  return 'incomplete';
}

/**
 * Formatea minutos a string legible: "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formatea una fecha ISO a hora local: "HH:MM"
 */
export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formatea una fecha ISO a formato legible: "Lunes 24 Mar"
 */
export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}
