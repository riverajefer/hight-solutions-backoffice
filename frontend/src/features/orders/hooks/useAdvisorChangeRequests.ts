import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advisorChangeRequestsApi } from '../../../api/advisor-change-requests.api';
import type { CreateAdvisorChangeRequestDto } from '../../../types/advisor-change-request.types';

export const ADVISOR_CHANGE_PENDING_KEY = ['advisor-change-requests', 'pending'];

/**
 * Hook para el flujo de cambio de asesor de una OP.
 * Expone la solicitud pendiente de la orden y la mutación de creación.
 */
export const useAdvisorChangeRequest = (orderId?: string) => {
  const queryClient = useQueryClient();

  const orderRequestQuery = useQuery({
    queryKey: ['advisor-change-requests', 'order', orderId],
    queryFn: () => advisorChangeRequestsApi.findByOrder(orderId!),
    enabled: !!orderId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateAdvisorChangeRequestDto) =>
      advisorChangeRequestsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['advisor-change-requests', 'order', orderId],
      });
      queryClient.invalidateQueries({ queryKey: ADVISOR_CHANGE_PENDING_KEY });
    },
  });

  const changeDirectlyMutation = useMutation({
    mutationFn: (dto: CreateAdvisorChangeRequestDto) =>
      advisorChangeRequestsApi.changeDirectly(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['advisor-change-requests', 'order', orderId],
      });
      queryClient.invalidateQueries({ queryKey: ADVISOR_CHANGE_PENDING_KEY });
      // La OP cambió de dueño: refrescar el detalle y los listados
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return { orderRequestQuery, createMutation, changeDirectlyMutation };
};
