import axiosInstance from './axios';
import type { DiscountApproval } from '../types/discount-approval.types';

export const discountApprovalsApi = {
  /**
   * Obtener solicitudes pendientes (usuarios con permiso approve_discounts)
   */
  findPending: async () => {
    const { data } = await axiosInstance.get<DiscountApproval[]>(
      '/discount-approvals/pending',
    );
    return data;
  },

  /**
   * Obtener todas las solicitudes
   */
  findAll: async () => {
    const { data } = await axiosInstance.get<DiscountApproval[]>(
      '/discount-approvals/all',
    );
    return data;
  },

  /**
   * Obtener solicitudes propias del usuario
   */
  findMy: async () => {
    const { data } = await axiosInstance.get<DiscountApproval[]>(
      '/discount-approvals/my',
    );
    return data;
  },

  /**
   * Aprobar solicitud de descuento
   */
  approve: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<DiscountApproval>(
      `/discount-approvals/${requestId}/approve`,
      { reviewNotes },
    );
    return data;
  },

  /**
   * Rechazar solicitud de descuento
   */
  reject: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<DiscountApproval>(
      `/discount-approvals/${requestId}/reject`,
      { reviewNotes },
    );
    return data;
  },
};
