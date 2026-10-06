import { ORDER_STATUS_CONFIG } from '../../../types/order.types';
import type {
  BoardColumnData,
  BoardFilters,
  ProductionBoardArea,
  ProductionBoardCard,
  SemaphoreSummary,
} from '../../../types/production-board.types';
import { parseCurrencyInput } from '../../../utils/currencyInput';
import { BOARD_STATUS_COLUMNS, BOARD_STATUS_LABELS } from '../boardConfig';
import { getDaysToDelivery, getSemaphore } from './deliverySemaphore';

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Aplica todos los filtros menos el del semáforo. El resumen de arriba se
 * calcula sobre este resultado: si también filtrara por semáforo, al elegir
 * «Vencidas» los demás contadores caerían a cero y no se podría cambiar de uno a otro.
 */
export const applyBaseFilters = (
  cards: ProductionBoardCard[],
  filters: BoardFilters,
): ProductionBoardCard[] => {
  const search = normalize(filters.search);
  const minTotal = parseCurrencyInput(filters.minTotal);

  return cards.filter((card) => {
    if (!filters.showDrafts && card.status === 'DRAFT') return false;
    if (filters.hideCounterSales && card.isCounterSale) return false;
    if (filters.advisorIds.length > 0 && !filters.advisorIds.includes(card.advisor.id)) {
      return false;
    }
    if (filters.areaId && !card.areas.some((area) => area.id === filters.areaId)) return false;
    if (minTotal > 0 && card.total < minTotal) return false;
    if (
      search &&
      !normalize(card.orderNumber).includes(search) &&
      !normalize(card.clientName).includes(search)
    ) {
      return false;
    }
    return true;
  });
};

export const applySemaphoreFilter = (
  cards: ProductionBoardCard[],
  filters: BoardFilters,
  today: Date = new Date(),
): ProductionBoardCard[] =>
  filters.semaphore
    ? cards.filter((card) => getSemaphore(card.deliveryDate, today) === filters.semaphore)
    : cards;

export const summarize = (
  cards: ProductionBoardCard[],
  today: Date = new Date(),
): SemaphoreSummary => {
  const summary: SemaphoreSummary = { overdue: 0, warning: 0, 'on-time': 0, 'no-date': 0 };
  cards.forEach((card) => {
    summary[getSemaphore(card.deliveryDate, today)] += 1;
  });
  return summary;
};

/**
 * Lo más urgente arriba: primero las que tienen fecha, de la más vencida a la
 * más lejana; al final las que no tienen fecha. Empata el mayor valor.
 */
export const sortByUrgency = (
  cards: ProductionBoardCard[],
  today: Date = new Date(),
): ProductionBoardCard[] =>
  [...cards].sort((a, b) => {
    const daysA = getDaysToDelivery(a.deliveryDate, today);
    const daysB = getDaysToDelivery(b.deliveryDate, today);
    if (daysA === null && daysB !== null) return 1;
    if (daysA !== null && daysB === null) return -1;
    if (daysA !== null && daysB !== null && daysA !== daysB) return daysA - daysB;
    return b.total - a.total;
  });

export const countOverdue = (cards: ProductionBoardCard[], today: Date = new Date()): number =>
  cards.filter((card) => getSemaphore(card.deliveryDate, today) === 'overdue').length;

const toColumn = (
  id: string,
  title: string,
  color: string,
  cards: ProductionBoardCard[],
  today: Date,
): BoardColumnData => {
  const sorted = sortByUrgency(cards, today);
  return {
    id,
    title,
    color,
    cards: sorted.filter((card) => !card.isCounterSale),
    counterSales: sorted.filter((card) => card.isCounterSale),
  };
};

const STATUS_COLUMN_COLORS: Record<string, string> = {
  default: 'grey.500',
  info: 'info.main',
  warning: 'warning.main',
  success: 'success.main',
  primary: 'primary.main',
  secondary: 'secondary.main',
  error: 'error.main',
};

/** Una columna por estado, siempre visibles aunque estén vacías. */
export const groupByStatus = (
  cards: ProductionBoardCard[],
  showDrafts: boolean,
  today: Date = new Date(),
): BoardColumnData[] =>
  BOARD_STATUS_COLUMNS.filter((status) => showDrafts || status !== 'DRAFT').map((status) =>
    toColumn(
      status,
      BOARD_STATUS_LABELS[status] ?? ORDER_STATUS_CONFIG[status].label,
      STATUS_COLUMN_COLORS[ORDER_STATUS_CONFIG[status].color],
      cards.filter((card) => card.status === status),
      today,
    ),
  );

/** Una columna por asesor con órdenes; primero quien tiene más vencidas. */
export const groupByAdvisor = (
  cards: ProductionBoardCard[],
  today: Date = new Date(),
): BoardColumnData[] => {
  const byAdvisor = new Map<string, { name: string; cards: ProductionBoardCard[] }>();
  cards.forEach((card) => {
    const group = byAdvisor.get(card.advisor.id) ?? { name: card.advisor.name, cards: [] };
    group.cards.push(card);
    byAdvisor.set(card.advisor.id, group);
  });

  return [...byAdvisor.entries()]
    .map(([id, group]) => ({
      column: toColumn(id, group.name, 'primary.main', group.cards, today),
      overdue: countOverdue(group.cards, today),
      total: group.cards.length,
    }))
    .sort((a, b) => b.overdue - a.overdue || b.total - a.total)
    .map(({ column }) => column);
};

/** Opciones de los filtros, derivadas de las órdenes que hay en el tablero. */
export const getAdvisorOptions = (
  cards: ProductionBoardCard[],
): { id: string; name: string }[] => {
  const byId = new Map<string, string>();
  cards.forEach((card) => byId.set(card.advisor.id, card.advisor.name));
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

export const getAreaOptions = (cards: ProductionBoardCard[]): ProductionBoardArea[] => {
  const byId = new Map<string, ProductionBoardArea>();
  cards.forEach((card) => card.areas.forEach((area) => byId.set(area.id, area)));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
};
