import axiosInstance from './axios';
import type {
  OrderStatusChangeRequest,
  CreateStatusChangeRequestDto,
  ApproveStatusChangeRequestDto,
  RejectStatusChangeRequestDto,
} from '../types/order-status-change-request.types';

export const orderStatusChangeRequestsApi = {
  /**
   * Crear solicitud de cambio de estado
   */
  create: async (dto: CreateStatusChangeRequestDto) => {
    const { data } = await axiosInstance.post<OrderStatusChangeRequest>(
      '/order-status-change-requests',
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes pendientes (solo admins)
   */
  findPending: async (orderId?: string) => {
    const { data } = await axiosInstance.get<OrderStatusChangeRequest[]>(
      '/order-status-change-requests/pending',
      { params: { orderId } },
    );
    return data;
  },

  /**
   * Aprobar solicitud (solo admins)
   */
  approve: async (requestId: string, dto: ApproveStatusChangeRequestDto) => {
    const { data } = await axiosInstance.put<OrderStatusChangeRequest>(
      `/order-status-change-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  /**
   * Rechazar solicitud (solo admins)
   */
  reject: async (requestId: string, dto: RejectStatusChangeRequestDto) => {
    const { data} = await axiosInstance.put<OrderStatusChangeRequest>(
      `/order-status-change-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes del usuario actual
   */
  findMyRequests: async () => {
    const { data } = await axiosInstance.get<OrderStatusChangeRequest[]>(
      '/order-status-change-requests/my-requests',
    );
    return data;
  },

  /**
   * Obtener solicitud específica
   */
  findOne: async (requestId: string) => {
    const { data } = await axiosInstance.get<OrderStatusChangeRequest>(
      `/order-status-change-requests/${requestId}`,
    );
    return data;
  },
};
