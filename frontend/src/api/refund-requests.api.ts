import axiosInstance from './axios';
import type {
  RefundRequest,
  CreateRefundRequestDto,
  ApproveRefundRequestDto,
  RejectRefundRequestDto,
} from '../types/refund-request.types';

export const refundRequestsApi = {
  /**
   * Crear solicitud de devolución
   */
  create: async (dto: CreateRefundRequestDto) => {
    const { data } = await axiosInstance.post<RefundRequest>(
      '/refund-requests',
      dto,
    );
    return data;
  },

  /**
   * Listar solicitudes pendientes (requiere approve_refunds)
   */
  findPending: async () => {
    const { data } = await axiosInstance.get<RefundRequest[]>(
      '/refund-requests/pending',
    );
    return data;
  },

  /**
   * Listar todas las solicitudes (requiere approve_refunds)
   */
  findAll: async () => {
    const { data } = await axiosInstance.get<RefundRequest[]>(
      '/refund-requests/all',
    );
    return data;
  },

  /**
   * Listar solicitudes del usuario actual
   */
  findMy: async () => {
    const { data } = await axiosInstance.get<RefundRequest[]>(
      '/refund-requests/my',
    );
    return data;
  },

  /**
   * Listar solicitudes de una orden
   */
  findByOrder: async (orderId: string) => {
    const { data } = await axiosInstance.get<RefundRequest[]>(
      `/refund-requests/by-order/${orderId}`,
    );
    return data;
  },

  /**
   * Obtener solicitud por id
   */
  findOne: async (id: string) => {
    const { data } = await axiosInstance.get<RefundRequest>(
      `/refund-requests/${id}`,
    );
    return data;
  },

  /**
   * Aprobar solicitud
   */
  approve: async (id: string, dto: ApproveRefundRequestDto = {}) => {
    const { data } = await axiosInstance.put<RefundRequest>(
      `/refund-requests/${id}/approve`,
      dto,
    );
    return data;
  },

  /**
   * Rechazar solicitud
   */
  reject: async (id: string, dto: RejectRefundRequestDto) => {
    const { data } = await axiosInstance.put<RefundRequest>(
      `/refund-requests/${id}/reject`,
      dto,
    );
    return data;
  },
};
