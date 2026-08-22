import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePendingVoidRequests,
  useCreateVoidRequest,
  useApproveVoidRequest,
  useRejectVoidRequest,
} from './useVoidRequests';
import { voidRequestsApi } from '../api/void-requests.api';
import { enqueueSnackbar } from 'notistack';

vi.mock('../api/void-requests.api', () => ({
  voidRequestsApi: {
    getPending: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));
vi.mock('notistack', () => ({ enqueueSnackbar: vi.fn() }));
// Evita arrastrar el módulo real de cash-register (y su cadena de axios).
vi.mock('../features/cash-register/hooks/useCashRegister', () => ({
  cashKeys: {
    movements: { all: ['cash-movements'] },
    sessions: { all: ['cash-sessions'] },
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

describe('useVoidRequests', () => {
  beforeEach(() => {
    (voidRequestsApi.getPending as any).mockResolvedValue([{ id: 'req1' }]);
    (voidRequestsApi.create as any).mockResolvedValue({ id: 'req1' });
    (voidRequestsApi.approve as any).mockResolvedValue({});
    (voidRequestsApi.reject as any).mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  describe('usePendingVoidRequests', () => {
    it('obtiene las solicitudes pendientes', async () => {
      const { result } = renderHook(() => usePendingVoidRequests(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([{ id: 'req1' }]);
    });

    it('no consulta cuando enabled es false', async () => {
      renderHook(() => usePendingVoidRequests(false), { wrapper: createWrapper() });
      await new Promise((r) => setTimeout(r, 0));
      expect(voidRequestsApi.getPending).not.toHaveBeenCalled();
    });
  });

  describe('useCreateVoidRequest', () => {
    it('crea la solicitud y notifica éxito', async () => {
      const { result } = renderHook(() => useCreateVoidRequest(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ movementId: 'cm1', dto: { voidReason: 'x' } as any });
      });

      expect(voidRequestsApi.create).toHaveBeenCalledWith('cm1', { voidReason: 'x' });
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Solicitud de anulación enviada correctamente',
        { variant: 'success' },
      );
    });

    it('muestra el error del backend al fallar', async () => {
      (voidRequestsApi.create as any).mockRejectedValue({
        response: { data: { message: 'Ya existe una solicitud' } },
      });
      const { result } = renderHook(() => useCreateVoidRequest(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current
          .mutateAsync({ movementId: 'cm1', dto: {} as any })
          .catch(() => {});
      });

      expect(enqueueSnackbar).toHaveBeenCalledWith('Ya existe una solicitud', {
        variant: 'error',
      });
    });
  });

  describe('useApproveVoidRequest', () => {
    it('aprueba con requestId y dto', async () => {
      const { result } = renderHook(() => useApproveVoidRequest(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ requestId: 'req1', dto: { reviewNotes: 'ok' } as any });
      });

      expect(voidRequestsApi.approve).toHaveBeenCalledWith('req1', { reviewNotes: 'ok' });
      expect(enqueueSnackbar).toHaveBeenCalledWith('Solicitud aprobada — movimiento anulado', {
        variant: 'success',
      });
    });
  });

  describe('useRejectVoidRequest', () => {
    it('rechaza con requestId y dto', async () => {
      const { result } = renderHook(() => useRejectVoidRequest(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ requestId: 'req1', dto: { reviewNotes: 'no' } as any });
      });

      expect(voidRequestsApi.reject).toHaveBeenCalledWith('req1', { reviewNotes: 'no' });
      expect(enqueueSnackbar).toHaveBeenCalledWith('Solicitud de anulación rechazada', {
        variant: 'info',
      });
    });
  });
});
