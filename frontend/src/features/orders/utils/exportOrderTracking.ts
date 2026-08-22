import * as XLSX from 'xlsx';
import type { AdvisorTrackingRow } from '../../../types/order.types';
import {
  DELIVERED_STATUSES,
  MEASURE_LABEL,
  MONTHS,
  PAID_MODE_LABEL,
  STATUS_COLUMNS,
  buildPivot,
  isGapRow,
  pivotTotals,
  statusLabel,
  type Measure,
  type PaidMode,
} from './orderTrackingPivot';

interface ExportParams {
  rows: AdvisorTrackingRow[];
  month: number;
  year: number;
  paidMode: PaidMode;
  /** true cuando el usuario solo ve sus propias OP. */
  scopedToOwn: boolean;
}

/** Las tres medidas van cada una en su hoja: el Excel no depende del toggle. */
const MEASURES: Measure[] = ['count', 'amount', 'balance'];

/** Nombre de hoja de Excel: máximo 31 caracteres y sin : \ / ? * [ ] */
const sheetName = (name: string) => name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);

function buildMeasureSheet(params: ExportParams, measure: Measure): unknown[][] {
  const { rows, month, year, paidMode, scopedToOwn } = params;
  const pivot = buildPivot(rows, measure, paidMode);
  const totals = pivotTotals(pivot);

  const header = [
    'Asesor',
    ...STATUS_COLUMNS.map((_, i) => statusLabel(i)),
    'Total',
    'Brecha (OP)',
    'Brecha (monto)',
  ];

  const body = pivot.map((r) => [
    r.advisorName,
    ...r.cells,
    r.total,
    r.gapCount,
    r.gapAmount,
  ]);

  const totalRow = [
    'Total general',
    ...totals,
    totals.reduce((a, b) => a + b, 0),
    pivot.reduce((acc, r) => acc + r.gapCount, 0),
    pivot.reduce((acc, r) => acc + r.gapAmount, 0),
  ];

  return [
    [`Seguimiento de OP — ${MEASURE_LABEL[measure]}`],
    [`${MONTHS[month - 1]} ${year} · incluye ${PAID_MODE_LABEL[paidMode]}`],
    [scopedToOwn ? 'Alcance: solo tus propias OP' : 'Alcance: todos los asesores'],
    ['Brecha = OP pagadas al 100% que aún no están marcadas como entregadas'],
    [],
    header,
    ...body,
    totalRow,
  ];
}

function buildSummarySheet(params: ExportParams): unknown[][] {
  const { rows, month, year, paidMode, scopedToOwn } = params;
  const sum = (
    filter: (r: AdvisorTrackingRow) => boolean,
    key: 'count' | 'netAmount' | 'pendingBalance',
  ) => rows.filter(filter).reduce((acc, r) => acc + r[key], 0);

  const commissionable = (r: AdvisorTrackingRow) =>
    r.paid && DELIVERED_STATUSES.includes(r.status);

  return [
    ['Seguimiento de OP — Resumen'],
    [`${MONTHS[month - 1]} ${year}`],
    [scopedToOwn ? 'Alcance: solo tus propias OP' : 'Alcance: todos los asesores'],
    [`Corte de las hojas por medida: ${PAID_MODE_LABEL[paidMode]}`],
    [`Generado: ${new Date().toLocaleString('es-CO')}`],
    [],
    ['Indicador', 'OP', 'Monto neto'],
    ['OP del mes', sum(() => true, 'count'), sum(() => true, 'netAmount')],
    ['Pagadas al 100%', sum((r) => r.paid, 'count'), sum((r) => r.paid, 'netAmount')],
    ['Con saldo pendiente', sum((r) => !r.paid, 'count'), sum((r) => !r.paid, 'netAmount')],
    ['Saldo pendiente por cobrar', '', sum((r) => !r.paid, 'pendingBalance')],
    ['Listas para comisión (entregadas + pagadas)', sum(commissionable, 'count'), sum(commissionable, 'netAmount')],
    ['Brecha (pagadas sin marcar entrega)', sum(isGapRow, 'count'), sum(isGapRow, 'netAmount')],
  ];
}

/**
 * Exporta la matriz del Seguimiento de OP a Excel: una hoja de resumen y una por
 * cada medida (n.º de OP, monto neto y saldo pendiente), para que el archivo
 * sirva sin importar qué toggle estuviera activo al descargarlo.
 *
 * Los valores van como números, no como texto formateado, para que en Excel se
 * puedan sumar y graficar.
 */
export function exportOrderTrackingToExcel(params: ExportParams): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildSummarySheet(params)),
    sheetName('Resumen'),
  );

  MEASURES.forEach((measure) => {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(buildMeasureSheet(params, measure)),
      sheetName(MEASURE_LABEL[measure]),
    );
  });

  const pad = (n: number) => String(n).padStart(2, '0');
  XLSX.writeFile(wb, `Seguimiento_OP_${params.year}-${pad(params.month)}.xlsx`);
}
