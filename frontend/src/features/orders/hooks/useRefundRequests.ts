import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { refundRequestsApi } from '../../../api/refund-requests.api';
import { ordersKeys } from './useOrders';
import type {
  CreateRefundRequestDto,
  ApproveRefundRequestDto,
  RejectRefundRequestDto,
} from '../../../types/refund-request.types';

// ============================================================
// QUERY KEYS
// ============================================================

export const refundRequestsKeys = {
  all: ['refund-requests'] as const,
  pending: () => [...refundRequestsKeys.all, 'pending'] as const,
  mine: () => [...refundRequestsKeys.all, 'mine'] as const,
  byOrder: (orderId: string) =>
    [...refundRequestsKeys.all, 'by-order', orderId] as const,
  detail: (id: string) => [...refundRequestsKeys.all, 'detail', id] as const,
};

// ============================================================
// QUERIES
// ============================================================

export const useRefundRequestsByOrder = (
  orderId: string | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: refundRequestsKeys.byOrder(orderId ?? ''),
    queryFn: () => refundRequestsApi.findByOrder(orderId as string),
    enabled: !!orderId && enabled,
  });
};

export const usePendingRefundRequests = (enabled = true) => {
  return useQuery({
    queryKey: refundRequestsKeys.pending(),
    queryFn: () => refundRequestsApi.findPending(),
    enabled,
    refetchInterval: 30_000,
  });
};

export const useMyRefundRequests = (enabled = true) => {
  return useQuery({
    queryKey: refundRequestsKeys.mine(),
    queryFn: () => refundRequestsApi.findMy(),
    enabled,
  });
};

// ============================================================
// MUTATIONS
// ============================================================

export const useCreateRefundRequest = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (dto: CreateRefundRequestDto) => refundRequestsApi.create(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: refundRequestsKeys.byOrder(data.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(data.orderId),
      });
      queryClient.invalidateQueries({ queryKey: refundRequestsKeys.pending() });
      queryClient.invalidateQueries({ queryKey: refundRequestsKeys.mine() });
      enqueueSnackbar('Solicitud de devolución enviada para aprobación', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al crear la solicitud';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useApproveRefundRequest = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto?: ApproveRefundRequestDto;
    }) => refundRequestsApi.approve(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: refundRequestsKeys.all });
      if (data.orderId) {
        queryClient.invalidateQueries({
          queryKey: ordersKeys.detail(data.orderId),
        });
      }
      enqueueSnackbar('Devolución aprobada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al aprobar la devolución';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useRejectRefundRequest = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectRefundRequestDto }) =>
      refundRequestsApi.reject(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: refundRequestsKeys.all });
      if (data?.orderId) {
        queryClient.invalidateQueries({
          queryKey: ordersKeys.detail(data.orderId),
        });
      }
      enqueueSnackbar('Devolución rechazada', { variant: 'info' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al rechazar la devolución';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};
