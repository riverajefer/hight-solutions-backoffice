import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProductionBoardPage from './ProductionBoardPage';
import { productionBoardApi } from '../../../api/production-board.api';
import type {
  ProductionBoardCard,
  ProductionBoardResponse,
} from '../../../types/production-board.types';

vi.mock('../../../api/production-board.api', () => ({
  productionBoardApi: { get: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const card = (overrides: Partial<ProductionBoardCard>): ProductionBoardCard => ({
  id: 'op-1',
  orderNumber: 'OP-2026-0001',
  status: 'CONFIRMED',
  orderDate: daysFromNow(-3),
  deliveryDate: null,
  total: 100_000,
  balance: 0,
  clientName: 'Cliente',
  advisor: { id: 'u-1', name: 'ADRIANA' },
  isCounterSale: false,
  workOrder: null,
  areas: [],
  items: [],
  ...overrides,
});

const board = (cards: ProductionBoardCard[], staleOpenCount = 0): ProductionBoardResponse => ({
  generatedAt: new Date().toISOString(),
  cutoffDate: '2026-09-05T12:00:00.000Z',
  staleOpenCount,
  cards,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductionBoardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const getMock = vi.mocked(productionBoardApi.get);

describe('ProductionBoardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('muestra las columnas por estado y el resumen del semáforo', async () => {
    getMock.mockResolvedValue(
      board([
        card({ id: 'vencida', orderNumber: 'OP-VENCIDA', deliveryDate: daysFromNow(-2) }),
        card({ id: 'hoy', orderNumber: 'OP-HOY', deliveryDate: daysFromNow(0) }),
        card({ id: 'lejos', orderNumber: 'OP-LEJOS', deliveryDate: daysFromNow(10), status: 'READY' }),
        card({ id: 'sin-fecha', orderNumber: 'OP-SIN-FECHA' }),
        card({ id: 'borrador', orderNumber: 'OP-BORRADOR', status: 'DRAFT' }),
      ]),
    );

    renderPage();

    expect(await screen.findByText('OP-VENCIDA')).toBeInTheDocument();
    expect(screen.getAllByTestId('board-column')).toHaveLength(4);
    expect(screen.getByText('Vencidas: 1')).toBeInTheDocument();
    expect(screen.getByText('Al límite: 1')).toBeInTheDocument();
    expect(screen.getByText('En tiempo: 1')).toBeInTheDocument();
    expect(screen.getByText('Sin fecha: 1')).toBeInTheDocument();
    expect(screen.queryByText('OP-BORRADOR')).not.toBeInTheDocument();
  });

  it('filtra el tablero al hacer clic en un contador del resumen', async () => {
    getMock.mockResolvedValue(
      board([
        card({ id: 'vencida', orderNumber: 'OP-VENCIDA', deliveryDate: daysFromNow(-2) }),
        card({ id: 'sin-fecha', orderNumber: 'OP-SIN-FECHA' }),
      ]),
    );

    renderPage();
    await userEvent.click(await screen.findByText('Vencidas: 1'));

    expect(screen.getByText('OP-VENCIDA')).toBeInTheDocument();
    expect(screen.queryByText('OP-SIN-FECHA')).not.toBeInTheDocument();
    // El resumen no cambia: sigue contando todo lo que pasa los demás filtros.
    expect(screen.getByText('Sin fecha: 1')).toBeInTheDocument();
  });

  it('agrupa las ventas de mostrador en un renglón desplegable', async () => {
    getMock.mockResolvedValue(
      board([
        card({ id: 'm1', orderNumber: 'OP-MOSTRADOR-1', isCounterSale: true }),
        card({ id: 'm2', orderNumber: 'OP-MOSTRADOR-2', isCounterSale: true, deliveryDate: daysFromNow(-1) }),
      ]),
    );

    renderPage();

    const group = await screen.findByRole('button', { name: /Mostrador · 2 órdenes · 1 vencida/ });
    expect(screen.queryByText('OP-MOSTRADOR-1')).not.toBeInTheDocument();

    await userEvent.click(group);

    expect(screen.getByText('OP-MOSTRADOR-1')).toBeInTheDocument();
  });

  it('cambia a la vista por asesor', async () => {
    getMock.mockResolvedValue(
      board([
        card({ id: 'a', orderNumber: 'OP-A' }),
        card({ id: 'n', orderNumber: 'OP-N', advisor: { id: 'u-2', name: 'NICOL' } }),
      ]),
    );

    renderPage();
    await screen.findByText('OP-A');
    await userEvent.click(screen.getByRole('button', { name: /Por asesor/ }));

    const columns = screen.getAllByTestId('board-column');
    expect(columns).toHaveLength(2);
    expect(within(columns[0]).getByText('ADRIANA')).toBeInTheDocument();
    expect(within(columns[1]).getByText('NICOL')).toBeInTheDocument();
  });

  it('lleva a la lista de órdenes antiguas con los filtros del aviso', async () => {
    getMock.mockResolvedValue(board([card({})], 934));

    renderPage();

    expect(await screen.findByText(/Hay 934 órdenes antiguas sin cerrar/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver órdenes' }));

    expect(mockNavigate).toHaveBeenCalledWith('/orders', {
      state: {
        orderFilters: {
          statuses: ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'PAID'],
          orderDateTo: '2026-09-05T12:00:00.000Z',
        },
      },
    });
  });

  it('muestra el error con opción de reintentar', async () => {
    getMock.mockRejectedValue(new Error('boom'));

    renderPage();

    expect(await screen.findByText('No se pudo cargar el tablero.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument());
  });
});
