import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePaymentEditApprovals } from './usePaymentEditApprovals';
import { paymentEditApprovalsApi } from '../../../api/payment-edit-approvals.api';

const { enqueueMock } = vi.hoisted(() => ({ enqueueMock: vi.fn() }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: enqueueMock }) }));

vi.mock('../../../api/payment-edit-approvals.api', () => ({
  paymentEditApprovalsApi: {
    getByOrder: vi.fn(),
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

describe('usePaymentEditApprovals', () => {
  beforeEach(() => {
    (paymentEditApprovalsApi.getByOrder as any).mockResolvedValue([{ id: 'req1' }]);
    (paymentEditApprovalsApi.approve as any).mockResolvedValue({});
    (paymentEditApprovalsApi.reject as any).mockResolvedValue({});
  });
  afterEach(() => vi.clearAllMocks());

  it('lista las solicitudes de la orden', async () => {
    const { result } = renderHook(() => usePaymentEditApprovals('o1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.approvalsQuery.isSuccess).toBe(true));
    expect(paymentEditApprovalsApi.getByOrder).toHaveBeenCalledWith('o1');
  });

  it('no consulta sin orderId', async () => {
    const { result } = renderHook(() => usePaymentEditApprovals(''), {
      wrapper: createWrapper(),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.approvalsQuery.fetchStatus).toBe('idle');
    expect(paymentEditApprovalsApi.getByOrder).not.toHaveBeenCalled();
  });

  it('approve aprueba y aplica la edición', async () => {
    const { result } = renderHook(() => usePaymentEditApprovals('o1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.approveMutation.mutateAsync({ id: 'req1', reviewNotes: 'ok' });
    });
    expect(paymentEditApprovalsApi.approve).toHaveBeenCalledWith('req1', 'ok');
    expect(enqueueMock).toHaveBeenCalledWith('Edición de pago aprobada y aplicada', {
      variant: 'success',
    });
  });

  it('reject rechaza la edición con variante info', async () => {
    const { result } = renderHook(() => usePaymentEditApprovals('o1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.rejectMutation.mutateAsync({ id: 'req1', reviewNotes: 'no' });
    });
    expect(paymentEditApprovalsApi.reject).toHaveBeenCalledWith('req1', 'no');
    expect(enqueueMock).toHaveBeenCalledWith('Edición de pago rechazada', { variant: 'info' });
  });

  it('approve muestra el error del backend', async () => {
    (paymentEditApprovalsApi.approve as any).mockRejectedValue({
      response: { data: { message: 'Sin permiso' } },
    });
    const { result } = renderHook(() => usePaymentEditApprovals('o1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.approveMutation.mutateAsync({ id: 'req1' }).catch(() => {});
    });
    expect(enqueueMock).toHaveBeenCalledWith('Sin permiso', { variant: 'error' });
  });
});
