import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { editRequestsApi } from '../api/edit-requests.api';
import {
  CreateEditRequestDto,
  ReviewEditRequestDto,
} from '../types/edit-request.types';

export const useEditRequests = (orderId: string) => {
  const queryClient = useQueryClient();

  // Query: Obtener todas las solicitudes de una orden
  const requestsQuery = useQuery({
    queryKey: ['edit-requests', orderId],
    queryFn: () => editRequestsApi.getByOrder(orderId),
    enabled: !!orderId,
  });

  // Query: Obtener permiso activo del usuario actual
  const activePermissionQuery = useQuery({
    queryKey: ['edit-requests', orderId, 'active'],
    queryFn: () => editRequestsApi.getActivePermission(orderId),
    enabled: !!orderId,
  });

  // Mutation: Crear solicitud de edición
  const createMutation = useMutation({
    mutationFn: (dto: CreateEditRequestDto) =>
      editRequestsApi.create(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests', orderId] });
      enqueueSnackbar('Solicitud enviada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Error al enviar solicitud de edición';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Aprobar solicitud
  const approveMutation = useMutation({
    mutationFn: ({
      requestId,
      dto,
    }: {
      requestId: string;
      dto: ReviewEditRequestDto;
    }) => editRequestsApi.approve(orderId, requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      enqueueSnackbar('Solicitud aprobada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al aprobar solicitud';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Rechazar solicitud
  const rejectMutation = useMutation({
    mutationFn: ({
      requestId,
      dto,
    }: {
      requestId: string;
      dto: ReviewEditRequestDto;
    }) => editRequestsApi.reject(orderId, requestId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      enqueueSnackbar('Solicitud rechazada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al rechazar solicitud';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    requestsQuery,
    activePermissionQuery,
    createMutation,
    approveMutation,
    rejectMutation,
  };
};
