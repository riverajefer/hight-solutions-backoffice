import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { paymentEditApprovalsApi } from '../../../api/payment-edit-approvals.api';
import { ordersKeys } from './useOrders';

export const paymentEditApprovalsKeys = {
  all: ['payment-edit-approvals'] as const,
  byOrder: (orderId: string) =>
    [...paymentEditApprovalsKeys.all, 'order', orderId] as const,
  pending: () => [...paymentEditApprovalsKeys.all, 'pending'] as const,
};

/**
 * Solicitudes de edición de pago de una orden, con acciones de aprobar/rechazar.
 */
export const usePaymentEditApprovals = (orderId: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const approvalsQuery = useQuery({
    queryKey: paymentEditApprovalsKeys.byOrder(orderId),
    queryFn: () => paymentEditApprovalsApi.getByOrder(orderId),
    enabled: !!orderId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: paymentEditApprovalsKeys.byOrder(orderId),
    });
    queryClient.invalidateQueries({ queryKey: ordersKeys.payments(orderId) });
    queryClient.invalidateQueries({ queryKey: ordersKeys.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      paymentEditApprovalsApi.approve(id, reviewNotes),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Edición de pago aprobada y aplicada', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al aprobar la edición',
        { variant: 'error' }
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      paymentEditApprovalsApi.reject(id, reviewNotes),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Edición de pago rechazada', { variant: 'info' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al rechazar la edición',
        { variant: 'error' }
      );
    },
  });

  return { approvalsQuery, approveMutation, rejectMutation };
};
