import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEditRequests } from './useEditRequests';
import { editRequestsApi } from '../api/edit-requests.api';
import { enqueueSnackbar } from 'notistack';

vi.mock('../api/edit-requests.api', () => ({
  editRequestsApi: {
    getByOrder: vi.fn(),
    getActivePermission: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));
vi.mock('notistack', () => ({ enqueueSnackbar: vi.fn() }));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useEditRequests', () => {
  beforeEach(() => {
    (editRequestsApi.getByOrder as any).mockResolvedValue([{ id: 'r1' }]);
    (editRequestsApi.getActivePermission as any).mockResolvedValue({ active: true });
    (editRequestsApi.create as any).mockResolvedValue({ id: 'r1' });
    (editRequestsApi.approve as any).mockResolvedValue({});
    (editRequestsApi.reject as any).mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('carga solicitudes y permiso activo de la orden', async () => {
    const { result } = renderHook(() => useEditRequests('o1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.requestsQuery.isSuccess).toBe(true));
    expect(editRequestsApi.getByOrder).toHaveBeenCalledWith('o1');
    expect(result.current.requestsQuery.data).toEqual([{ id: 'r1' }]);

    await waitFor(() => expect(result.current.activePermissionQuery.isSuccess).toBe(true));
    expect(editRequestsApi.getActivePermission).toHaveBeenCalledWith('o1');
  });

  it('no dispara las queries sin orderId', async () => {
    renderHook(() => useEditRequests(''), { wrapper: createWrapper() });
    // Un tick para que react-query resuelva estados
    await new Promise((r) => setTimeout(r, 0));
    expect(editRequestsApi.getByOrder).not.toHaveBeenCalled();
  });

  it('createMutation crea y notifica éxito', async () => {
    const { result } = renderHook(() => useEditRequests('o1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.createMutation.mutateAsync({ reason: 'x' } as any);
    });

    expect(editRequestsApi.create).toHaveBeenCalledWith('o1', { reason: 'x' });
    expect(enqueueSnackbar).toHaveBeenCalledWith('Solicitud enviada correctamente', {
      variant: 'success',
    });
  });

  it('approveMutation aprueba con orderId, requestId y dto', async () => {
    const { result } = renderHook(() => useEditRequests('o1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.approveMutation.mutateAsync({
        requestId: 'r1',
        dto: { reviewNotes: 'ok' } as any,
      });
    });

    expect(editRequestsApi.approve).toHaveBeenCalledWith('o1', 'r1', { reviewNotes: 'ok' });
  });

  it('rejectMutation muestra el error del backend al fallar', async () => {
    (editRequestsApi.reject as any).mockRejectedValue({
      response: { data: { message: 'No permitido' } },
    });
    const { result } = renderHook(() => useEditRequests('o1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.rejectMutation
        .mutateAsync({ requestId: 'r1', dto: {} as any })
        .catch(() => {});
    });

    expect(enqueueSnackbar).toHaveBeenCalledWith('No permitido', { variant: 'error' });
  });
});
