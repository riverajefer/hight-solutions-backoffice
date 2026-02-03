import  axiosInstance  from './axios';
import { Notification } from '../types/edit-request.types';

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationsFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export const notificationsApi = {
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  getAll: async (params?: NotificationsFilters) => {
    const { data } = await axiosInstance.get<NotificationsResponse>(
      '/notifications',
      { params },
    );
    return data;
  },

  /**
   * Contar notificaciones no leídas
   */
  countUnread: async () => {
    const { data } = await axiosInstance.get<{ count: number }>(
      '/notifications/unread-count',
    );
    return data.count;
  },

  /**
   * Marcar notificación como leída
   */
  markAsRead: async (notificationId: string) => {
    const { data } = await axiosInstance.put<Notification>(
      `/notifications/${notificationId}/read`,
    );
    return data;
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead: async () => {
    await axiosInstance.put('/notifications/mark-all-read');
  },

  /**
   * Eliminar notificación
   */
  delete: async (notificationId: string) => {
    await axiosInstance.delete(`/notifications/${notificationId}`);
  },
};
