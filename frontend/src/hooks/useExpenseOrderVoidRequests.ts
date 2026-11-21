import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { expenseOrderVoidRequestsApi } from '../api/expense-order-void-requests.api';
import { expenseOrdersKeys } from '../features/expense-orders/hooks/useExpenseOrders';
import { cashKeys } from '../features/cash-register/hooks/useCashRegister';
import type {
  CreateExpenseOrderVoidRequestDto,
  ReviewExpenseOrderVoidRequestDto,
} from '../types/expense-order-void-request.types';

export const expenseOrderVoidKeys = {
  all: ['expense-order-void-requests'] as const,
  pending: () => [...expenseOrderVoidKeys.all, 'pending'] as const,
  history: () => [...expenseOrderVoidKeys.all, 'all'] as const,
  preview: (expenseOrderId: string) => [...expenseOrderVoidKeys.all, 'preview', expenseOrderId] as const,
  expenseOrder: (expenseOrderId: string) => [...expenseOrderVoidKeys.all, 'expense-order', expenseOrderId] as const,
};

const errorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
};

export const useExpenseOrderVoidPreview = (expenseOrderId: string | null) =>
  useQuery({
    queryKey: expenseOrderVoidKeys.preview(expenseOrderId ?? ''),
    queryFn: () => expenseOrderVoidRequestsApi.preview(expenseOrderId!),
    enabled: !!expenseOrderId,
  });

export const useExpenseOrderVoidRequestsOf = (expenseOrderId: string) =>
  useQuery({
    queryKey: expenseOrderVoidKeys.expenseOrder(expenseOrderId),
    queryFn: () => expenseOrderVoidRequestsApi.getByExpenseOrder(expenseOrderId),
    enabled: !!expenseOrderId,
  });

export const useExpenseOrderVoidRequests = (view: 'pending' | 'history', enabled = true) =>
  useQuery({
    queryKey: view === 'pending' ? expenseOrderVoidKeys.pending() : expenseOrderVoidKeys.history(),
    queryFn: () =>
      view === 'pending' ? expenseOrderVoidRequestsApi.getPending() : expenseOrderVoidRequestsApi.getAll(),
    enabled,
  });

export const useCreateExpenseOrderVoidRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseOrderId, dto }: { expenseOrderId: string; dto: CreateExpenseOrderVoidRequestDto }) =>
      expenseOrderVoidRequestsApi.create(expenseOrderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseOrderVoidKeys.all });
      enqueueSnackbar('Solicitud de anulación enviada. Un administrador debe aprobarla.', {
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(errorMessage(error, 'No se pudo enviar la solicitud de anulación'), { variant: 'error' });
    },
  });
};

const useReviewMutation = (action: 'approve' | 'reject') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, dto }: { requestId: string; dto: ReviewExpenseOrderVoidRequestDto }) =>
      expenseOrderVoidRequestsApi[action](requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseOrderVoidKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.all });
      queryClient.invalidateQueries({ queryKey: cashKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      enqueueSnackbar(action === 'approve' ? 'OG anulada' : 'Anulación rechazada', { variant: 'success' });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(
        errorMessage(error, action === 'approve' ? 'No se pudo anular la OG' : 'No se pudo rechazar'),
        { variant: 'error' },
      );
    },
  });
};

export const useApproveExpenseOrderVoidRequest = () => useReviewMutation('approve');
export const useRejectExpenseOrderVoidRequest = () => useReviewMutation('reject');

/** Cantidad de anulaciones pendientes, para la insignia de la bandeja. */
export const usePendingExpenseOrderVoidCount = (enabled: boolean) =>
  useExpenseOrderVoidRequests('pending', enabled).data?.length ?? 0;
