import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { voidRequestsApi } from '../api/void-requests.api';
import { cashKeys } from '../features/cash-register/hooks/useCashRegister';
import type {
  CreateVoidRequestDto,
  ReviewVoidRequestDto,
} from '../types/void-request.types';

export const voidRequestKeys = {
  all: ['void-requests'] as const,
  pending: () => [...voidRequestKeys.all, 'pending'] as const,
};

export const usePendingVoidRequests = (enabled = true) => {
  return useQuery({
    queryKey: voidRequestKeys.pending(),
    queryFn: () => voidRequestsApi.getPending(),
    enabled,
    refetchInterval: 15_000,
  });
};

export const useCreateVoidRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      movementId,
      dto,
    }: {
      movementId: string;
      dto: CreateVoidRequestDto;
    }) => voidRequestsApi.create(movementId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.all });
      enqueueSnackbar('Solicitud de anulación enviada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Error al enviar solicitud de anulación';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useApproveVoidRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      dto,
    }: {
      requestId: string;
      dto: ReviewVoidRequestDto;
    }) => voidRequestsApi.approve(requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: cashKeys.movements.all });
      queryClient.invalidateQueries({ queryKey: cashKeys.sessions.all });
      enqueueSnackbar('Solicitud aprobada — movimiento anulado', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al aprobar solicitud';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useRejectVoidRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      dto,
    }: {
      requestId: string;
      dto: ReviewVoidRequestDto;
    }) => voidRequestsApi.reject(requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voidRequestKeys.all });
      enqueueSnackbar('Solicitud de anulación rechazada', {
        variant: 'info',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al rechazar solicitud';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};
