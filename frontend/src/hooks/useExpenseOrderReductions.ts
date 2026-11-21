import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { expenseOrderReductionRequestsApi } from '../api/expense-order-reduction-requests.api';
import { expenseOrdersKeys } from '../features/expense-orders/hooks/useExpenseOrders';
import { cashKeys } from '../features/cash-register/hooks/useCashRegister';
import type {
  CreateExpenseOrderReductionDto,
  RegisterReductionRefundDto,
} from '../types/expense-order-reduction.types';

export const expenseOrderReductionKeys = {
  all: ['expense-order-reduction-requests'] as const,
  pending: () => [...expenseOrderReductionKeys.all, 'pending'] as const,
  history: () => [...expenseOrderReductionKeys.all, 'all'] as const,
  expenseOrder: (id: string) => [...expenseOrderReductionKeys.all, 'expense-order', id] as const,
};

const errorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
};

export const useExpenseOrderReductionsOf = (expenseOrderId: string) =>
  useQuery({
    queryKey: expenseOrderReductionKeys.expenseOrder(expenseOrderId),
    queryFn: () => expenseOrderReductionRequestsApi.getByExpenseOrder(expenseOrderId),
    enabled: !!expenseOrderId,
  });

export const useExpenseOrderReductionRequests = (view: 'pending' | 'history', enabled = true) =>
  useQuery({
    queryKey: view === 'pending' ? expenseOrderReductionKeys.pending() : expenseOrderReductionKeys.history(),
    queryFn: () =>
      view === 'pending'
        ? expenseOrderReductionRequestsApi.getPending()
        : expenseOrderReductionRequestsApi.getAll(),
    enabled,
  });

export const usePendingExpenseOrderReductionCount = (enabled: boolean) =>
  useExpenseOrderReductionRequests('pending', enabled).data?.length ?? 0;

const useInvalidateAll = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: expenseOrderReductionKeys.all });
    queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.all });
    queryClient.invalidateQueries({ queryKey: cashKeys.sessions.all });
    queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
  };
};

export const useCreateExpenseOrderReduction = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ expenseOrderId, dto }: { expenseOrderId: string; dto: CreateExpenseOrderReductionDto }) =>
      expenseOrderReductionRequestsApi.create(expenseOrderId, dto),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Solicitud enviada. Un administrador debe aprobarla.', { variant: 'success' });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(errorMessage(error, 'No se pudo enviar la solicitud'), { variant: 'error' });
    },
  });
};

export const useReviewExpenseOrderReduction = (action: 'approve' | 'reject') => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ requestId, reviewNotes }: { requestId: string; reviewNotes?: string }) =>
      expenseOrderReductionRequestsApi[action](requestId, reviewNotes),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar(action === 'approve' ? 'Valor de la OG bajado' : 'Solicitud rechazada', {
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(errorMessage(error, action === 'approve' ? 'No se pudo aplicar' : 'No se pudo rechazar'), {
        variant: 'error',
      });
    },
  });
};

export const useRegisterReductionRefund = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ requestId, dto }: { requestId: string; dto: RegisterReductionRefundDto }) =>
      expenseOrderReductionRequestsApi.registerRefund(requestId, dto),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Reintegro registrado en la caja', { variant: 'success' });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(errorMessage(error, 'No se pudo registrar el reintegro'), { variant: 'error' });
    },
  });
};
