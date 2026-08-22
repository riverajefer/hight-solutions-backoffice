import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuotes } from './useQuotes';
import { quotesApi } from '../../../api/quotes.api';

const { enqueueMock } = vi.hoisted(() => ({ enqueueMock: vi.fn() }));
vi.mock('notistack', () => ({ enqueueSnackbar: enqueueMock }));

vi.mock('../../../api/quotes.api', () => ({
  quotesApi: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    convertToOrder: vi.fn(),
  },
}));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useQuotes', () => {
  beforeEach(() => {
    (quotesApi.findAll as any).mockResolvedValue({ data: [{ id: 'q1' }] });
    (quotesApi.create as any).mockResolvedValue({ id: 'q1' });
    (quotesApi.update as any).mockResolvedValue({ id: 'q1' });
    (quotesApi.delete as any).mockResolvedValue({});
    (quotesApi.convertToOrder as any).mockResolvedValue({ orderId: 'o1' });
  });
  afterEach(() => vi.clearAllMocks());

  it('lista cotizaciones con filtros', async () => {
    const { result } = renderHook(() => useQuotes({ status: 'DRAFT' } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.quotesQuery.isSuccess).toBe(true));
    expect(quotesApi.findAll).toHaveBeenCalledWith({ status: 'DRAFT' });
  });

  it('create notifica éxito', async () => {
    const { result } = renderHook(() => useQuotes(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createQuoteMutation.mutateAsync({ clientId: 'c1' } as any);
    });
    expect(quotesApi.create).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith('Cotización creada exitosamente', {
      variant: 'success',
    });
  });

  it('update y delete llaman a la API', async () => {
    const { result } = renderHook(() => useQuotes(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.updateQuoteMutation.mutateAsync({ id: 'q1', data: { notes: 'x' } as any });
    });
    await act(async () => {
      await result.current.deleteQuoteMutation.mutateAsync('q1');
    });
    expect(quotesApi.update).toHaveBeenCalledWith('q1', { notes: 'x' });
    expect(quotesApi.delete).toHaveBeenCalledWith('q1');
  });

  it('convertToOrder convierte la cotización', async () => {
    const { result } = renderHook(() => useQuotes(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.convertToOrderMutation.mutateAsync('q1');
    });
    expect(quotesApi.convertToOrder).toHaveBeenCalledWith('q1');
    expect(enqueueMock).toHaveBeenCalledWith('Cotización convertida a orden exitosamente', {
      variant: 'success',
    });
  });

  it('muestra el error del backend al fallar la creación', async () => {
    (quotesApi.create as any).mockRejectedValue({
      response: { data: { message: 'Faltan ítems' } },
    });
    const { result } = renderHook(() => useQuotes(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createQuoteMutation.mutateAsync({} as any).catch(() => {});
    });
    expect(enqueueMock).toHaveBeenCalledWith('Faltan ítems', { variant: 'error' });
  });
});
