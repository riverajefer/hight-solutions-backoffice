import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRefundRequestsByOrder,
  usePendingRefundRequests,
  useMyRefundRequests,
  useCreateRefundRequest,
  useApproveRefundRequest,
  useRejectRefundRequest,
} from './useRefundRequests';
import { refundRequestsApi } from '../../../api/refund-requests.api';

const { enqueueMock } = vi.hoisted(() => ({ enqueueMock: vi.fn() }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: enqueueMock }) }));

vi.mock('../../../api/refund-requests.api', () => ({
  refundRequestsApi: {
    findByOrder: vi.fn(),
    findPending: vi.fn(),
    findMy: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
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

beforeEach(() => {
  (refundRequestsApi.findByOrder as any).mockResolvedValue([{ id: 'r1' }]);
  (refundRequestsApi.findPending as any).mockResolvedValue([]);
  (refundRequestsApi.findMy as any).mockResolvedValue([]);
  (refundRequestsApi.create as any).mockResolvedValue({ id: 'r1', orderId: 'o1' });
  (refundRequestsApi.approve as any).mockResolvedValue({ id: 'r1', orderId: 'o1' });
  (refundRequestsApi.reject as any).mockResolvedValue({ id: 'r1', orderId: 'o1' });
});
afterEach(() => vi.clearAllMocks());

describe('queries de devoluciones', () => {
  it('useRefundRequestsByOrder consulta por orden', async () => {
    const { result } = renderHook(() => useRefundRequestsByOrder('o1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(refundRequestsApi.findByOrder).toHaveBeenCalledWith('o1');
  });

  it('useRefundRequestsByOrder no consulta sin orderId', async () => {
    const { result } = renderHook(() => useRefundRequestsByOrder(undefined), {
      wrapper: createWrapper(),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.fetchStatus).toBe('idle');
    expect(refundRequestsApi.findByOrder).not.toHaveBeenCalled();
  });

  it('usePendingRefundRequests y useMyRefundRequests consultan', async () => {
    const { result: pending } = renderHook(() => usePendingRefundRequests(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(pending.current.isSuccess).toBe(true));
    const { result: mine } = renderHook(() => useMyRefundRequests(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(mine.current.isSuccess).toBe(true));
    expect(refundRequestsApi.findPending).toHaveBeenCalled();
    expect(refundRequestsApi.findMy).toHaveBeenCalled();
  });

  it('usePendingRefundRequests no consulta cuando enabled es false', async () => {
    renderHook(() => usePendingRefundRequests(false), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(refundRequestsApi.findPending).not.toHaveBeenCalled();
  });
});

describe('mutaciones de devoluciones', () => {
  it('create envía la solicitud y notifica', async () => {
    const { result } = renderHook(() => useCreateRefundRequest(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ orderId: 'o1', amount: 100 } as any);
    });
    expect(refundRequestsApi.create).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith('Solicitud de devolución enviada para aprobación', {
      variant: 'success',
    });
  });

  it('approve aprueba con id y dto opcional', async () => {
    const { result } = renderHook(() => useApproveRefundRequest(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 'r1', dto: { notes: 'ok' } as any });
    });
    expect(refundRequestsApi.approve).toHaveBeenCalledWith('r1', { notes: 'ok' });
    expect(enqueueMock).toHaveBeenCalledWith('Devolución aprobada correctamente', {
      variant: 'success',
    });
  });

  it('reject rechaza con variante info', async () => {
    const { result } = renderHook(() => useRejectRefundRequest(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 'r1', dto: { reason: 'no' } as any });
    });
    expect(refundRequestsApi.reject).toHaveBeenCalledWith('r1', { reason: 'no' });
    expect(enqueueMock).toHaveBeenCalledWith('Devolución rechazada', { variant: 'info' });
  });

  it('create muestra el error del backend', async () => {
    (refundRequestsApi.create as any).mockRejectedValue({
      response: { data: { message: 'Monto inválido' } },
    });
    const { result } = renderHook(() => useCreateRefundRequest(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ orderId: 'o1' } as any).catch(() => {});
    });
    expect(enqueueMock).toHaveBeenCalledWith('Monto inválido', { variant: 'error' });
  });
});
