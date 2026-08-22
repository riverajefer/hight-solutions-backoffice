import { describe, expect, it } from 'vitest';
import {
  STATUS_COLUMNS,
  buildPivot,
  isGapRow,
  pivotTotals,
  statusLabel,
} from './orderTrackingPivot';
import type { AdvisorTrackingRow } from '../../../types/order.types';

const row = (o: Partial<AdvisorTrackingRow>): AdvisorTrackingRow => ({
  advisorId: 'a1',
  advisorName: 'Laura Maldonado',
  status: 'CONFIRMED',
  paid: true,
  count: 1,
  netAmount: 1000,
  pendingBalance: 0,
  ...o,
});

const col = (status: string) => STATUS_COLUMNS.findIndex((c) => c.value === status);

describe('buildPivot', () => {
  it('suma cada celda en la columna de su estado', () => {
    const pivot = buildPivot(
      [
        row({ status: 'DRAFT', count: 3 }),
        row({ status: 'DRAFT', count: 2, paid: false }),
        row({ status: 'DELIVERED', count: 1 }),
      ],
      'count',
      'all',
    );

    expect(pivot).toHaveLength(1);
    expect(pivot[0].cells[col('DRAFT')]).toBe(5);
    expect(pivot[0].cells[col('DELIVERED')]).toBe(1);
    expect(pivot[0].total).toBe(6);
  });

  it('el corte «solo pagadas» deja fuera las que tienen saldo', () => {
    const rows = [
      row({ status: 'DRAFT', count: 3, paid: true }),
      row({ status: 'DRAFT', count: 2, paid: false }),
    ];

    expect(buildPivot(rows, 'count', 'paid')[0].cells[col('DRAFT')]).toBe(3);
    expect(buildPivot(rows, 'count', 'due')[0].cells[col('DRAFT')]).toBe(2);
  });

  it('la brecha ignora el corte activo: siempre son las pagadas sin entregar', () => {
    const rows = [
      row({ status: 'CONFIRMED', paid: true, count: 4, netAmount: 400 }),
      row({ status: 'DELIVERED', paid: true, count: 1, netAmount: 100 }),
      row({ status: 'DRAFT', paid: false, count: 9, netAmount: 900 }),
    ];

    // Bajo «solo las que tienen saldo» la brecha seguiría siendo 4, no 0:
    // si dependiera del toggle, la pantalla diría que no hay nada pendiente.
    for (const modo of ['all', 'paid', 'due'] as const) {
      const [p] = buildPivot(rows, 'count', modo);
      expect(p.gapCount).toBe(4);
      expect(p.gapAmount).toBe(400);
    }
  });

  it('no cuenta las anuladas ni las entregadas a crédito dentro de la brecha', () => {
    const rows = [
      row({ status: 'ANULADO', paid: true, count: 5 }),
      row({ status: 'DELIVERED_ON_CREDIT', paid: true, count: 2 }),
      row({ status: 'WARRANTY', paid: true, count: 1 }),
      row({ status: 'READY', paid: true, count: 3 }),
    ];

    expect(buildPivot(rows, 'count', 'all')[0].gapCount).toBe(3);
  });

  it('ordena por magnitud del total, para que los saldos negativos no queden al final', () => {
    const pivot = buildPivot(
      [
        row({ advisorId: 'a1', advisorName: 'Chico', status: 'DRAFT', pendingBalance: 10 }),
        row({ advisorId: 'a2', advisorName: 'Grande', status: 'DRAFT', pendingBalance: -900 }),
      ],
      'balance',
      'all',
    );

    expect(pivot.map((p) => p.advisorName)).toEqual(['Grande', 'Chico']);
  });

  it('cae al id cuando el asesor no tiene nombre', () => {
    const pivot = buildPivot([row({ advisorId: 'sin-nombre', advisorName: '' })], 'count', 'all');
    expect(pivot[0].advisorName).toBe('sin-nombre');
  });
});

describe('pivotTotals', () => {
  it('suma cada columna sobre todos los asesores', () => {
    const pivot = buildPivot(
      [
        row({ advisorId: 'a1', status: 'DRAFT', count: 3 }),
        row({ advisorId: 'a2', status: 'DRAFT', count: 4 }),
        row({ advisorId: 'a2', status: 'READY', count: 1 }),
      ],
      'count',
      'all',
    );

    const totals = pivotTotals(pivot);
    expect(totals[col('DRAFT')]).toBe(7);
    expect(totals[col('READY')]).toBe(1);
  });
});

describe('isGapRow', () => {
  it('solo marca las pagadas que aún no se entregan', () => {
    expect(isGapRow(row({ status: 'CONFIRMED', paid: true }))).toBe(true);
    expect(isGapRow(row({ status: 'CONFIRMED', paid: false }))).toBe(false);
    expect(isGapRow(row({ status: 'DELIVERED', paid: true }))).toBe(false);
    expect(isGapRow(row({ status: 'ANULADO', paid: true }))).toBe(false);
  });
});

describe('statusLabel', () => {
  it('usa el nombre completo cuando el encabezado va abreviado', () => {
    expect(statusLabel(col('CONFIRMED'))).toBe('Confirmada');
    expect(statusLabel(col('DELIVERED_ON_CREDIT'))).toBe('Entregada a crédito');
    expect(statusLabel(col('DRAFT'))).toBe('Borrador');
  });
});
