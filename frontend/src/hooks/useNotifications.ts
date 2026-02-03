import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import {
  notificationsApi,
  NotificationsFilters,
} from '../api/notifications.api';

export const useNotifications = (filters?: NotificationsFilters) => {
  const queryClient = useQueryClient();

  // Query: Obtener todas las notificaciones
  const notificationsQuery = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.getAll(filters || { limit: 50 }),
    refetchInterval: 60000, // Revalidar cada 1 minuto
  });

  // Query: Contar notificaciones no leídas
  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.countUnread(),
    refetchInterval: 30000, // Revalidar cada 30 segundos
  });

  // Mutation: Marcar como leída
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Error al marcar notificación como leída';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      enqueueSnackbar('Todas las notificaciones marcadas como leídas', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        'Error al marcar todas las notificaciones';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Eliminar notificación
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      enqueueSnackbar('Notificación eliminada', { variant: 'success' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al eliminar notificación';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    notificationsQuery,
    unreadCountQuery,
    markAsReadMutation,
    markAllAsReadMutation,
    deleteMutation,
  };
};
