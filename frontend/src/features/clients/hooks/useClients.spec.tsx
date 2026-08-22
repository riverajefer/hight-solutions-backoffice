import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClients, useClient, useClientStats } from './useClients';
import { clientsApi } from '../../../api/clients.api';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';

vi.mock('../../../api/clients.api', () => ({
  clientsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadCsv: vi.fn(),
    updateSpecialCondition: vi.fn(),
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

describe('useClients', () => {
  beforeEach(() => {
    (clientsApi.getAll as any).mockResolvedValue({ data: [{ id: 'c1' }] });
    (clientsApi.getById as any).mockResolvedValue({ id: 'c1' });
    (clientsApi.getStats as any).mockResolvedValue({ totalOrders: 0 });
    (clientsApi.create as any).mockResolvedValue({ id: 'c1' });
    (clientsApi.update as any).mockResolvedValue({ id: 'c1' });
    (clientsApi.delete as any).mockResolvedValue({});
    (clientsApi.uploadCsv as any).mockResolvedValue({ imported: 3 });
    (clientsApi.updateSpecialCondition as any).mockResolvedValue({ id: 'c1' });
    // Otorga el permiso de lectura para habilitar la query.
    useAuthStore.setState({ permissions: [PERMISSIONS.READ_CLIENTS] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ permissions: [] });
  });

  it('lista clientes cuando el usuario tiene permiso de lectura', async () => {
    const { result } = renderHook(() => useClients({ page: 1 } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.clientsQuery.isSuccess).toBe(true));
    expect(clientsApi.getAll).toHaveBeenCalledWith({ page: 1 });
  });

  it('no consulta clientes sin permiso de lectura', async () => {
    useAuthStore.setState({ permissions: [] });
    renderHook(() => useClients(), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(clientsApi.getAll).not.toHaveBeenCalled();
  });

  it('create pasa data y force', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createClientMutation.mutateAsync({
        data: { name: 'Ana' } as any,
        force: true,
      });
    });
    expect(clientsApi.create).toHaveBeenCalledWith({ name: 'Ana' }, true);
  });

  it('create usa force=false por defecto', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createClientMutation.mutateAsync({ data: { name: 'B' } as any });
    });
    expect(clientsApi.create).toHaveBeenCalledWith({ name: 'B' }, false);
  });

  it('update, delete, uploadCsv y updateSpecialCondition llaman a la API', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.updateClientMutation.mutateAsync({ id: 'c1', data: { name: 'E' } as any });
    });
    await act(async () => {
      await result.current.deleteClientMutation.mutateAsync('c1');
    });
    const file = new File(['x'], 'clientes.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.uploadCsvMutation.mutateAsync(file);
    });
    await act(async () => {
      await result.current.updateSpecialConditionMutation.mutateAsync({
        id: 'c1',
        data: { specialCondition: 'VIP' } as any,
      });
    });

    expect(clientsApi.update).toHaveBeenCalledWith('c1', { name: 'E' });
    expect(clientsApi.delete).toHaveBeenCalledWith('c1');
    expect(clientsApi.uploadCsv).toHaveBeenCalledWith(file);
    expect(clientsApi.updateSpecialCondition).toHaveBeenCalledWith('c1', {
      specialCondition: 'VIP',
    });
  });
});

describe('useClient / useClientStats', () => {
  beforeEach(() => {
    (clientsApi.getById as any).mockResolvedValue({ id: 'c1' });
    (clientsApi.getStats as any).mockResolvedValue({ totalOrders: 5 });
  });
  afterEach(() => vi.clearAllMocks());

  it('useClient consulta por id', async () => {
    const { result } = renderHook(() => useClient('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientsApi.getById).toHaveBeenCalledWith('c1');
  });

  it('useClient no consulta con id vacío', async () => {
    vi.clearAllMocks();
    const { result } = renderHook(() => useClient(''), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.fetchStatus).toBe('idle');
    expect(clientsApi.getById).not.toHaveBeenCalled();
  });

  it('useClientStats consulta las estadísticas del cliente', async () => {
    const { result } = renderHook(() => useClientStats('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientsApi.getStats).toHaveBeenCalledWith('c1');
  });
});
