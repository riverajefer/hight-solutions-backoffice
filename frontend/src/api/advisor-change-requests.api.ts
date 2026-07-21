import axiosInstance from './axios';
import type {
  AdvisorChangeRequest,
  CreateAdvisorChangeRequestDto,
  ApproveAdvisorChangeRequestDto,
  RejectAdvisorChangeRequestDto,
} from '../types/advisor-change-request.types';

export const advisorChangeRequestsApi = {
  /**
   * Crear solicitud de cambio de asesor
   */
  create: async (dto: CreateAdvisorChangeRequestDto) => {
    const { data } = await axiosInstance.post<AdvisorChangeRequest>(
      '/advisor-change-requests',
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes pendientes (solo admins)
   */
  findPending: async (orderId?: string) => {
    const { data } = await axiosInstance.get<AdvisorChangeRequest[]>(
      '/advisor-change-requests/pending',
      { params: { orderId } },
    );
    return data;
  },

  /**
   * Obtener todas las solicitudes (solo admins)
   */
  findAll: async (orderId?: string) => {
    const { data } = await axiosInstance.get<AdvisorChangeRequest[]>(
      '/advisor-change-requests/all',
      { params: { orderId } },
    );
    return data;
  },

  /**
   * Obtener la solicitud pendiente de una OP (o null)
   */
  findByOrder: async (orderId: string) => {
    const { data } = await axiosInstance.get<AdvisorChangeRequest | null>(
      `/advisor-change-requests/order/${orderId}`,
    );
    return data;
  },

  /**
   * Aprobar solicitud (solo admins) — reasigna el asesor de la OP
   */
  approve: async (requestId: string, dto: ApproveAdvisorChangeRequestDto) => {
    const { data } = await axiosInstance.put<AdvisorChangeRequest>(
      `/advisor-change-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  /**
   * Rechazar solicitud (solo admins)
   */
  reject: async (requestId: string, dto: RejectAdvisorChangeRequestDto) => {
    const { data } = await axiosInstance.put<AdvisorChangeRequest>(
      `/advisor-change-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes del usuario actual
   */
  findMyRequests: async () => {
    const { data } = await axiosInstance.get<AdvisorChangeRequest[]>(
      '/advisor-change-requests/my-requests',
    );
    return data;
  },
};
