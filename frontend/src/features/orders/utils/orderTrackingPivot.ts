import type { AdvisorTrackingRow, OrderStatus } from '../../../types/order.types';

/**
 * Armado de la matriz asesor × estado del Seguimiento de OP.
 *
 * Vive fuera del componente porque la pantalla y la exportación a Excel tienen
 * que contar exactamente lo mismo: si el pivote se duplicara, el Excel y la
 * tabla se irían separando en cuanto alguno de los dos cambie.
 */

export type Measure = 'count' | 'amount' | 'balance';
export type PaidMode = 'all' | 'paid' | 'due';

export type MeasureField = keyof Pick<
  AdvisorTrackingRow,
  'count' | 'netAmount' | 'pendingBalance'
>;

export const MEASURE_FIELD: Record<Measure, MeasureField> = {
  count: 'count',
  amount: 'netAmount',
  balance: 'pendingBalance',
};

export const MEASURE_LABEL: Record<Measure, string> = {
  count: 'N.º de OP',
  amount: 'Monto neto',
  balance: 'Saldo pendiente',
};

export const PAID_MODE_LABEL: Record<PaidMode, string> = {
  all: 'pagadas y con saldo',
  paid: 'solo las pagadas al 100%',
  due: 'solo las que tienen saldo',
};

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Columnas de la matriz. Es el flujo real de la OP, de izquierda a derecha, para
 * que la fila se lea como el avance del pedido. `label` es la versión corta que
 * usa la tabla; `full` es el nombre completo para tooltips y para el Excel, que
 * no tiene problema de ancho.
 */
export const STATUS_COLUMNS: { value: OrderStatus; label: string; full?: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirm.', full: 'Confirmada' },
  { value: 'IN_PRODUCTION', label: 'En prod.', full: 'En producción' },
  { value: 'READY', label: 'Lista' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'DELIVERED_ON_CREDIT', label: 'Ent. créd.', full: 'Entregada a crédito' },
  { value: 'WARRANTY', label: 'Garantía' },
  { value: 'ANULADO', label: 'Anulada' },
];

export const statusLabel = (i: number) => STATUS_COLUMNS[i].full ?? STATUS_COLUMNS[i].label;

/** Estados en los que la entrega ya ocurrió: son los que pueden comisionar. */
export const DELIVERED_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'DELIVERED_ON_CREDIT',
  'WARRANTY',
];

/** ¿La OP está pagada al 100% pero todavía sin marcar como entregada? */
export const isGapRow = (r: AdvisorTrackingRow) =>
  r.paid && !DELIVERED_STATUSES.includes(r.status) && r.status !== 'ANULADO';

/**
 * Una OP anulada no es una venta. Conserva su columna en la matriz —interesa ver
 * cuántas se anularon en el mes— pero queda fuera de los totales y de los
 * indicadores: sumarla infla lo vendido y, si quedó con saldo, aparece además
 * como cartera por cobrar que nadie va a cobrar.
 */
export const isVoidedRow = (r: AdvisorTrackingRow) => r.status === 'ANULADO';

/** Filtro base de los indicadores: todo lo que sí cuenta como venta del mes. */
export const countsAsSale = (r: AdvisorTrackingRow) => !isVoidedRow(r);

/** Índice de la columna «Anulada», la única que no entra en los totales. */
const VOIDED_COLUMN_INDEX = STATUS_COLUMNS.findIndex((c) => c.value === 'ANULADO');

export interface PivotRow {
  advisorId: string;
  advisorName: string;
  /** Un valor por cada columna de `STATUS_COLUMNS`, en el mismo orden. */
  cells: number[];
  /** Suma de las celdas **sin** la columna «Anulada». */
  total: number;
  /** OP pagadas al 100% que aún no están marcadas como entregadas. */
  gapCount: number;
  gapAmount: number;
}

export function buildPivot(
  rows: AdvisorTrackingRow[],
  measure: Measure,
  paidMode: PaidMode,
): PivotRow[] {
  const field = MEASURE_FIELD[measure];
  const inPaidMode = (r: AdvisorTrackingRow) =>
    paidMode === 'all' || (paidMode === 'paid' ? r.paid : !r.paid);

  const advisors = [...new Set(rows.map((r) => r.advisorId))];

  return advisors
    .map((advisorId) => {
      const mine = rows.filter((r) => r.advisorId === advisorId);
      const cells = STATUS_COLUMNS.map(({ value }) =>
        mine
          .filter((r) => r.status === value && inPaidMode(r))
          .reduce((acc, r) => acc + r[field], 0),
      );
      // La brecha no depende del corte activo: son siempre las pagadas sin
      // entregar. Bajo «solo las que tienen saldo» daría cero y se leería como
      // que no hay nada pendiente, justo lo contrario de lo que pasa.
      const gapRows = mine.filter(isGapRow);
      return {
        advisorId,
        // `||` y no `??`: un asesor sin nombre llega como cadena vacía, y una
        // fila sin etiqueta no se puede leer.
        advisorName: mine[0]?.advisorName || advisorId,
        cells,
        total: cells.reduce(
          (acc, v, i) => (i === VOIDED_COLUMN_INDEX ? acc : acc + v),
          0,
        ),
        gapCount: gapRows.reduce((acc, r) => acc + r.count, 0),
        gapAmount: gapRows.reduce((acc, r) => acc + r.netAmount, 0),
      };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/** Totales por columna de un pivote ya armado, la de anuladas incluida. */
export const pivotTotals = (pivot: PivotRow[]) =>
  STATUS_COLUMNS.map((_, i) => pivot.reduce((acc, r) => acc + r.cells[i], 0));

/**
 * Total general de la matriz. Suma los totales de fila —que ya excluyen las
 * anuladas— en vez de los totales de columna, que sí las traen.
 */
export const pivotGrandTotal = (pivot: PivotRow[]) =>
  pivot.reduce((acc, r) => acc + r.total, 0);
