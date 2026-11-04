import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { cashTransferRequestsApi } from '../api/cash-transfer-requests.api';
import { cashKeys } from '../features/cash-register/hooks/useCashRegister';
import type {
  CreateCashTransferRequestDto,
  ReviewCashTransferRequestDto,
} from '../types/cash-transfer-request.types';

export const cashTransferKeys = {
  all: ['cash-transfer-requests'] as const,
  pending: () => [...cashTransferKeys.all, 'pending'] as const,
  history: () => [...cashTransferKeys.all, 'all'] as const,
  preview: (movementId: string) => [...cashTransferKeys.all, 'preview', movementId] as const,
  session: (sessionId: string) => [...cashTransferKeys.all, 'session', sessionId] as const,
  expenseOrder: (id: string) => [...cashTransferKeys.all, 'expense-order', id] as const,
};

const errorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
};

export const useCashTransferPreview = (movementId: string | null) =>
  useQuery({
    queryKey: cashTransferKeys.preview(movementId ?? ''),
    queryFn: () => cashTransferRequestsApi.preview(movementId!),
    enabled: !!movementId,
  });

export const useSessionCashTransfers = (sessionId: string) =>
  useQuery({
    queryKey: cashTransferKeys.session(sessionId),
    queryFn: () => cashTransferRequestsApi.getBySession(sessionId),
    enabled: !!sessionId,
  });

export const useExpenseOrderCashTransfers = (expenseOrderId: string, enabled = true) =>
  useQuery({
    queryKey: cashTransferKeys.expenseOrder(expenseOrderId),
    queryFn: () => cashTransferRequestsApi.getExpenseOrderMovements(expenseOrderId),
    enabled: enabled && !!expenseOrderId,
  });

export const useCashTransferRequests = (view: 'pending' | 'history', enabled = true) =>
  useQuery({
    queryKey: view === 'pending' ? cashTransferKeys.pending() : cashTransferKeys.history(),
    queryFn: () =>
      view === 'pending' ? cashTransferRequestsApi.getPending() : cashTransferRequestsApi.getAll(),
    enabled,
  });

export const useCreateCashTransferRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ movementId, dto }: { movementId: string; dto: CreateCashTransferRequestDto }) =>
      cashTransferRequestsApi.create(movementId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashTransferKeys.all });
      enqueueSnackbar('Solicitud de traslado enviada. El administrador debe aprobarla.', {
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(errorMessage(error, 'No se pudo enviar la solicitud de traslado'), {
        variant: 'error',
      });
    },
  });
};

const useReviewMutation = (action: 'approve' | 'reject') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, dto }: { requestId: string; dto: ReviewCashTransferRequestDto }) =>
      cashTransferRequestsApi[action](requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashTransferKeys.all });
      queryClient.invalidateQueries({ queryKey: cashKeys.sessions.all });
      enqueueSnackbar(
        action === 'approve'
          ? 'Traslado aplicado: el movimiento ya está en la caja de hoy'
          : 'Traslado rechazado',
        { variant: 'success' },
      );
    },
    onError: (error: unknown) => {
      enqueueSnackbar(
        errorMessage(error, action === 'approve' ? 'No se pudo aplicar el traslado' : 'No se pudo rechazar'),
        { variant: 'error' },
      );
    },
  });
};

export const useApproveCashTransferRequest = () => useReviewMutation('approve');
export const useRejectCashTransferRequest = () => useReviewMutation('reject');

/** Cantidad de traslados pendientes, para la insignia de la bandeja. */
export const usePendingCashTransferCount = (enabled: boolean) =>
  useCashTransferRequests('pending', enabled).data?.length ?? 0;
