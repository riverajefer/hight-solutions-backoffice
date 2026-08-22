import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAccountsPayable,
  useAccountPayableSummary,
  useAccountPayable,
  useAccountPayablePayments,
  useApPaymentAuthRequests,
} from './useAccountsPayable';
import { accountsPayableApi } from '../../../api/accounts-payable.api';
import { apPaymentAuthRequestsApi } from '../../../api/accounts-payable-payment-auth-requests.api';

const { enqueueMock } = vi.hoisted(() => ({ enqueueMock: vi.fn() }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: enqueueMock }) }));

vi.mock('../../../api/accounts-payable.api', () => ({
  accountsPayableApi: {
    getAll: vi.fn(),
    getSummary: vi.fn(),
    getById: vi.fn(),
    getPayments: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    registerPayment: vi.fn(),
    deletePayment: vi.fn(),
    addAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    setInstallments: vi.fn(),
    toggleInstallmentPaid: vi.fn(),
    deleteInstallment: vi.fn(),
  },
}));
vi.mock('../../../api/accounts-payable-payment-auth-requests.api', () => ({
  apPaymentAuthRequestsApi: {
    findByAccountPayable: vi.fn(),
    create: vi.fn(),
    adminApprove: vi.fn(),
    adminReject: vi.fn(),
    cajaApprove: vi.fn(),
    cajaReject: vi.fn(),
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

describe('useAccountsPayable (lista)', () => {
  beforeEach(() => {
    (accountsPayableApi.getAll as any).mockResolvedValue({ data: [{ id: 'ap1' }], meta: {} });
    (accountsPayableApi.create as any).mockResolvedValue({ id: 'ap1' });
    (accountsPayableApi.cancel as any).mockResolvedValue({ id: 'ap1' });
  });
  afterEach(() => vi.clearAllMocks());

  it('lista las cuentas por pagar con filtros', async () => {
    const { result } = renderHook(() => useAccountsPayable({ status: 'PENDING' } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(accountsPayableApi.getAll).toHaveBeenCalledWith({ status: 'PENDING' });
  });

  it('create notifica éxito', async () => {
    const { result } = renderHook(() => useAccountsPayable(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createMutation.mutateAsync({ totalAmount: 1000 } as any);
    });
    expect(accountsPayableApi.create).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith('Cuenta por pagar creada correctamente', {
      variant: 'success',
    });
  });

  it('cancel muestra el error del backend', async () => {
    (accountsPayableApi.cancel as any).mockRejectedValue({
      response: { data: { message: 'No se puede anular' } },
    });
    const { result } = renderHook(() => useAccountsPayable(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.cancelMutation
        .mutateAsync({ id: 'ap1', dto: {} as any })
        .catch(() => {});
    });
    expect(enqueueMock).toHaveBeenCalledWith('No se puede anular', { variant: 'error' });
  });
});

describe('useAccountPayableSummary', () => {
  afterEach(() => vi.clearAllMocks());
  it('carga el resumen', async () => {
    (accountsPayableApi.getSummary as any).mockResolvedValue({ totalPending: 0 });
    const { result } = renderHook(() => useAccountPayableSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(accountsPayableApi.getSummary).toHaveBeenCalled();
  });
});

describe('useAccountPayable (detalle)', () => {
  beforeEach(() => {
    (accountsPayableApi.getById as any).mockResolvedValue({ id: 'ap1' });
    (accountsPayableApi.registerPayment as any).mockResolvedValue({ id: 'pay1' });
    (accountsPayableApi.deletePayment as any).mockResolvedValue({});
  });
  afterEach(() => vi.clearAllMocks());

  it('carga el detalle cuando hay id', async () => {
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(accountsPayableApi.getById).toHaveBeenCalledWith('ap1');
  });

  it('no carga el detalle sin id', async () => {
    vi.clearAllMocks();
    const { result } = renderHook(() => useAccountPayable(undefined), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.query.fetchStatus).toBe('idle');
    expect(accountsPayableApi.getById).not.toHaveBeenCalled();
  });

  it('registerPayment registra el pago y notifica', async () => {
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.registerPaymentMutation.mutateAsync({ amount: 500 } as any);
    });
    expect(accountsPayableApi.registerPayment).toHaveBeenCalledWith('ap1', { amount: 500 });
    expect(enqueueMock).toHaveBeenCalledWith('Pago registrado correctamente', {
      variant: 'success',
    });
  });

  it('deletePayment anula el pago', async () => {
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.deletePaymentMutation.mutateAsync('pay1');
    });
    expect(accountsPayableApi.deletePayment).toHaveBeenCalledWith('ap1', 'pay1');
  });

  it('update guarda cambios y notifica', async () => {
    (accountsPayableApi.update as any).mockResolvedValue({ id: 'ap1' });
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.updateMutation.mutateAsync({ description: 'Nueva' } as any);
    });
    expect(accountsPayableApi.update).toHaveBeenCalledWith('ap1', { description: 'Nueva' });
    expect(enqueueMock).toHaveBeenCalledWith('Cuenta actualizada correctamente', {
      variant: 'success',
    });
  });

  it('adjuntos: agregar y eliminar', async () => {
    (accountsPayableApi.addAttachment as any).mockResolvedValue({ id: 'att1' });
    (accountsPayableApi.deleteAttachment as any).mockResolvedValue({});
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addAttachmentMutation.mutateAsync({ fileUrl: 'u' } as any);
    });
    await act(async () => {
      await result.current.deleteAttachmentMutation.mutateAsync('att1');
    });

    expect(accountsPayableApi.addAttachment).toHaveBeenCalledWith('ap1', { fileUrl: 'u' });
    expect(accountsPayableApi.deleteAttachment).toHaveBeenCalledWith('ap1', 'att1');
  });

  it('cuotas: definir plan, alternar pago y eliminar', async () => {
    (accountsPayableApi.setInstallments as any).mockResolvedValue([]);
    (accountsPayableApi.toggleInstallmentPaid as any).mockResolvedValue({});
    (accountsPayableApi.deleteInstallment as any).mockResolvedValue({});
    const { result } = renderHook(() => useAccountPayable('ap1'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.setInstallmentsMutation.mutateAsync({ installments: [] } as any);
    });
    await act(async () => {
      await result.current.toggleInstallmentPaidMutation.mutateAsync({
        installmentId: 'i1',
        dto: { isPaid: true } as any,
      });
    });
    await act(async () => {
      await result.current.deleteInstallmentMutation.mutateAsync('i1');
    });

    expect(accountsPayableApi.setInstallments).toHaveBeenCalledWith('ap1', { installments: [] });
    expect(accountsPayableApi.toggleInstallmentPaid).toHaveBeenCalledWith('ap1', 'i1', {
      isPaid: true,
    });
    expect(accountsPayableApi.deleteInstallment).toHaveBeenCalledWith('ap1', 'i1');
    expect(enqueueMock).toHaveBeenCalledWith('Plan de cuotas guardado correctamente', {
      variant: 'success',
    });
  });
});

describe('useAccountPayablePayments', () => {
  afterEach(() => vi.clearAllMocks());
  it('consulta los pagos de la CP', async () => {
    (accountsPayableApi.getPayments as any).mockResolvedValue([{ id: 'pay1' }]);
    const { result } = renderHook(() => useAccountPayablePayments('ap1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(accountsPayableApi.getPayments).toHaveBeenCalledWith('ap1');
  });
});

describe('useApPaymentAuthRequests (autorización de pago admin→caja)', () => {
  beforeEach(() => {
    (apPaymentAuthRequestsApi.findByAccountPayable as any).mockResolvedValue([{ id: 'req1' }]);
    (apPaymentAuthRequestsApi.create as any).mockResolvedValue({ id: 'req1' });
    (apPaymentAuthRequestsApi.adminApprove as any).mockResolvedValue({});
    (apPaymentAuthRequestsApi.adminReject as any).mockResolvedValue({});
    (apPaymentAuthRequestsApi.cajaApprove as any).mockResolvedValue({});
    (apPaymentAuthRequestsApi.cajaReject as any).mockResolvedValue({});
  });
  afterEach(() => vi.clearAllMocks());

  it('lista las solicitudes por cuenta por pagar', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.paymentAuthRequestsQuery.isSuccess).toBe(true));
    expect(apPaymentAuthRequestsApi.findByAccountPayable).toHaveBeenCalledWith('ap1');
  });

  it('crea la solicitud de pago', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.createRequestMutation.mutateAsync({ amount: 100 } as any);
    });
    expect(apPaymentAuthRequestsApi.create).toHaveBeenCalled();
  });

  it('adminApprove aprueba con id y dto', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.adminApproveMutation.mutateAsync({ id: 'req1', dto: {} as any });
    });
    expect(apPaymentAuthRequestsApi.adminApprove).toHaveBeenCalledWith('req1', {});
  });

  it('cajaApprove ejecuta el pago', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.cajaApproveMutation.mutateAsync('req1');
    });
    expect(apPaymentAuthRequestsApi.cajaApprove).toHaveBeenCalledWith('req1');
    expect(enqueueMock).toHaveBeenCalledWith('Pago registrado correctamente por Caja', {
      variant: 'success',
    });
  });

  it('adminReject rechaza en el paso 1', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.adminRejectMutation.mutateAsync({ id: 'req1', dto: {} as any });
    });
    expect(apPaymentAuthRequestsApi.adminReject).toHaveBeenCalledWith('req1', {});
  });

  it('cajaReject rechaza en el paso 2 (Caja)', async () => {
    const { result } = renderHook(() => useApPaymentAuthRequests('ap1'), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.cajaRejectMutation.mutateAsync({
        id: 'req1',
        dto: { reason: 'sin fondos' } as any,
      });
    });
    expect(apPaymentAuthRequestsApi.cajaReject).toHaveBeenCalledWith('req1', {
      reason: 'sin fondos',
    });
    expect(enqueueMock).toHaveBeenCalledWith('Solicitud de pago rechazada por Caja', {
      variant: 'success',
    });
  });
});
