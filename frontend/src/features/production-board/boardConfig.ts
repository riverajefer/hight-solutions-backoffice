import type { OrderStatus } from '../../types/order.types';
import type { BoardFilters, Semaphore } from '../../types/production-board.types';

/**
 * Parámetros provisionales del tablero. Viven en un solo archivo porque el
 * cliente todavía no define las reglas del semáforo ni las etapas.
 */

/** Ventana del tablero en días hacia atrás. */
export const BOARD_DAYS = 30;

/** Amarillo: la entrega es hoy o dentro de estos días calendario. */
export const WARNING_DAYS = 1;

/** Tarjetas visibles por columna antes de «Ver más». */
export const COLUMN_CAP = 15;

export const BOARD_REFETCH_MS = 60_000;

/** Columnas de la vista por estado, en el orden del flujo de la OP. */
export const BOARD_STATUS_COLUMNS: OrderStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'PAID',
];

/** Estados abiertos sin borradores: los que cuenta el aviso de órdenes antiguas. */
export const BOARD_OPEN_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'PAID',
];

/** En el tablero «Pagada» significa pagada y todavía sin entregar. */
export const BOARD_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  PAID: 'Pagada por entregar',
};

export const SEMAPHORE_ORDER: Semaphore[] = ['overdue', 'warning', 'on-time', 'no-date'];

export const SEMAPHORE_CONFIG: Record<
  Semaphore,
  { label: string; color: string; chipColor: 'error' | 'warning' | 'success' | 'default' }
> = {
  overdue: { label: 'Vencidas', color: 'error.main', chipColor: 'error' },
  warning: { label: 'Al límite', color: 'warning.main', chipColor: 'warning' },
  'on-time': { label: 'En tiempo', color: 'success.main', chipColor: 'success' },
  'no-date': { label: 'Sin fecha', color: 'grey.500', chipColor: 'default' },
};

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  view: 'status',
  advisorIds: [],
  areaId: null,
  minTotal: '',
  hideCounterSales: false,
  showDrafts: false,
  semaphore: null,
  search: '',
};
