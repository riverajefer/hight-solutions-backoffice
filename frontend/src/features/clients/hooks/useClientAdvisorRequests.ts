import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAdvisorRequestsApi } from '../../../api/client-advisor-requests.api';
import type {
  CreateClientAdvisorRequestDto,
  ApproveClientAdvisorRequestDto,
  RejectClientAdvisorRequestDto,
} from '../../../types/client-advisor-request.types';

export const CLIENT_ADVISOR_PENDING_KEY = ['client-advisor-requests', 'pending'];

/**
 * Hook para el flujo de solicitud de asignación de asesor a un cliente.
 * Expone las solicitudes del cliente y la mutación de creación.
 */
export const useClientAdvisorRequests = (clientId?: string) => {
  const queryClient = useQueryClient();

  const clientRequestsQuery = useQuery({
    queryKey: ['client-advisor-requests', 'client', clientId],
    queryFn: () => clientAdvisorRequestsApi.findByClient(clientId!),
    enabled: !!clientId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ['client-advisor-requests', 'client', clientId],
    });
    queryClient.invalidateQueries({ queryKey: CLIENT_ADVISOR_PENDING_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateClientAdvisorRequestDto) =>
      clientAdvisorRequestsApi.create(dto),
    onSuccess: invalidateAll,
  });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: ApproveClientAdvisorRequestDto;
    }) => clientAdvisorRequestsApi.approve(id, dto),
    onSuccess: () => {
      invalidateAll();
      // El asesor pasó a ser co-dueño: refrescar clientes
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: RejectClientAdvisorRequestDto;
    }) => clientAdvisorRequestsApi.reject(id, dto),
    onSuccess: invalidateAll,
  });

  return {
    clientRequestsQuery,
    createMutation,
    approveMutation,
    rejectMutation,
  };
};
