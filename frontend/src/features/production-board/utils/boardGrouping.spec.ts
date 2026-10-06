import { describe, expect, it } from 'vitest';
import type { BoardFilters, ProductionBoardCard } from '../../../types/production-board.types';
import { DEFAULT_BOARD_FILTERS } from '../boardConfig';
import {
  applyBaseFilters,
  applySemaphoreFilter,
  getAdvisorOptions,
  getAreaOptions,
  groupByAdvisor,
  groupByStatus,
  sortByUrgency,
  summarize,
} from './boardGrouping';

const today = new Date(2026, 9, 5, 12, 0, 0);
const localDate = (day: number) => new Date(2026, 9, day, 12, 0, 0).toISOString();

const ADRIANA = { id: 'u-adriana', name: 'ADRIANA' };
const NICOL = { id: 'u-nicol', name: 'NICOL' };
const SUBLIMACION = { id: 'a-sub', name: 'Sublimación' };
const DTF_UV = { id: 'a-uv', name: 'DTF UV' };

const card = (overrides: Partial<ProductionBoardCard> = {}): ProductionBoardCard => ({
  id: 'op-1',
  orderNumber: 'OP-2026-0001',
  status: 'CONFIRMED',
  orderDate: localDate(1),
  deliveryDate: null,
  total: 100_000,
  balance: 0,
  clientName: 'Fundación Social',
  advisor: ADRIANA,
  isCounterSale: false,
  workOrder: null,
  areas: [SUBLIMACION],
  items: [],
  ...overrides,
});

const filters = (overrides: Partial<BoardFilters> = {}): BoardFilters => ({
  ...DEFAULT_BOARD_FILTERS,
  ...overrides,
});

const ids = (cards: ProductionBoardCard[]) => cards.map((c) => c.id);

describe('applyBaseFilters', () => {
  const cards = [
    card({ id: 'confirmada' }),
    card({ id: 'borrador', status: 'DRAFT' }),
    card({ id: 'mostrador', isCounterSale: true, total: 20_000 }),
    card({ id: 'nicol', advisor: NICOL, areas: [DTF_UV], clientName: 'Inmobiliaria ABC', orderNumber: 'OP-2026-0777' }),
  ];

  it('oculta los borradores por defecto y los muestra a pedido', () => {
    expect(ids(applyBaseFilters(cards, filters()))).toEqual(['confirmada', 'mostrador', 'nicol']);
    expect(ids(applyBaseFilters(cards, filters({ showDrafts: true })))).toContain('borrador');
  });

  it('oculta las ventas de mostrador', () => {
    expect(ids(applyBaseFilters(cards, filters({ hideCounterSales: true })))).toEqual([
      'confirmada',
      'nicol',
    ]);
  });

  it('filtra por asesor, área y valor mínimo', () => {
    expect(ids(applyBaseFilters(cards, filters({ advisorIds: [NICOL.id] })))).toEqual(['nicol']);
    expect(ids(applyBaseFilters(cards, filters({ areaId: DTF_UV.id })))).toEqual(['nicol']);
    expect(ids(applyBaseFilters(cards, filters({ minTotal: '50000' })))).toEqual([
      'confirmada',
      'nicol',
    ]);
  });

  it('busca por número de OP o cliente sin distinguir tildes ni mayúsculas', () => {
    expect(ids(applyBaseFilters(cards, filters({ search: '0777' })))).toEqual(['nicol']);
    expect(ids(applyBaseFilters(cards, filters({ search: 'fundacion' })))).toEqual([
      'confirmada',
      'mostrador',
    ]);
  });

  it('no aplica el filtro del semáforo', () => {
    expect(applyBaseFilters(cards, filters({ semaphore: 'overdue' }))).toHaveLength(3);
  });
});

describe('summarize y applySemaphoreFilter', () => {
  const cards = [
    card({ id: 'vencida', deliveryDate: localDate(2) }),
    card({ id: 'hoy', deliveryDate: localDate(5) }),
    card({ id: 'lejos', deliveryDate: localDate(20) }),
    card({ id: 'sin-fecha' }),
    card({ id: 'sin-fecha-2' }),
  ];

  it('cuenta las órdenes por color', () => {
    expect(summarize(cards, today)).toEqual({ overdue: 1, warning: 1, 'on-time': 1, 'no-date': 2 });
  });

  it('deja solo las del color elegido', () => {
    expect(ids(applySemaphoreFilter(cards, filters({ semaphore: 'no-date' }), today))).toEqual([
      'sin-fecha',
      'sin-fecha-2',
    ]);
    expect(applySemaphoreFilter(cards, filters(), today)).toHaveLength(5);
  });
});

describe('sortByUrgency', () => {
  it('pone primero lo más vencido, luego lo próximo y al final lo que no tiene fecha', () => {
    const sorted = sortByUrgency(
      [
        card({ id: 'sin-fecha-barata', total: 10 }),
        card({ id: 'lejos', deliveryDate: localDate(20) }),
        card({ id: 'sin-fecha-cara', total: 999 }),
        card({ id: 'vencida-1d', deliveryDate: localDate(4) }),
        card({ id: 'vencida-3d', deliveryDate: localDate(2) }),
        card({ id: 'hoy-barata', deliveryDate: localDate(5), total: 10 }),
        card({ id: 'hoy-cara', deliveryDate: localDate(5), total: 999 }),
      ],
      today,
    );

    expect(ids(sorted)).toEqual([
      'vencida-3d',
      'vencida-1d',
      'hoy-cara',
      'hoy-barata',
      'lejos',
      'sin-fecha-cara',
      'sin-fecha-barata',
    ]);
  });
});

describe('groupByStatus', () => {
  const cards = [
    card({ id: 'c1' }),
    card({ id: 'c2-mostrador', isCounterSale: true }),
    card({ id: 'lista', status: 'READY' }),
    card({ id: 'pagada', status: 'PAID' }),
  ];

  it('arma una columna por estado, en orden y aunque esté vacía', () => {
    const columns = groupByStatus(cards, false, today);

    expect(columns.map((c) => c.title)).toEqual([
      'Confirmada',
      'En Producción',
      'Lista para entrega',
      'Pagada por entregar',
    ]);
    expect(columns[1].cards).toHaveLength(0);
  });

  it('incluye la columna de borradores solo si se pide', () => {
    expect(groupByStatus(cards, true, today)[0].title).toBe('Borrador');
  });

  it('separa las ventas de mostrador del resto', () => {
    const [confirmed] = groupByStatus(cards, false, today);

    expect(ids(confirmed.cards)).toEqual(['c1']);
    expect(ids(confirmed.counterSales)).toEqual(['c2-mostrador']);
  });
});

describe('groupByAdvisor', () => {
  it('ordena primero al asesor con más vencidas y luego al que tiene más órdenes', () => {
    const columns = groupByAdvisor(
      [
        card({ id: 'a1' }),
        card({ id: 'a2' }),
        card({ id: 'a3' }),
        card({ id: 'n1', advisor: NICOL, deliveryDate: localDate(1) }),
      ],
      today,
    );

    expect(columns.map((c) => c.title)).toEqual(['NICOL', 'ADRIANA']);
    expect(columns[1].cards).toHaveLength(3);
  });
});

describe('opciones de filtros', () => {
  const cards = [
    card(),
    card({ id: 'op-2', advisor: NICOL, areas: [DTF_UV, SUBLIMACION] }),
    card({ id: 'op-3', advisor: NICOL, areas: [] }),
  ];

  it('lista cada asesor y cada área una sola vez, en orden alfabético', () => {
    expect(getAdvisorOptions(cards)).toEqual([ADRIANA, NICOL]);
    expect(getAreaOptions(cards)).toEqual([DTF_UV, SUBLIMACION]);
  });
});
