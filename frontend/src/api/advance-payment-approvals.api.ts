import axiosInstance from './axios';
import type { AdvancePaymentApproval } from '../types/advance-payment-approval.types';

export const advancePaymentApprovalsApi = {
  /**
   * Obtener solicitudes pendientes (usuarios con permiso approve_advance_payments)
   */
  findPending: async () => {
    const { data } = await axiosInstance.get<AdvancePaymentApproval[]>(
      '/advance-payment-approvals/pending',
    );
    return data;
  },

  /**
   * Obtener todas las solicitudes
   */
  findAll: async () => {
    const { data } = await axiosInstance.get<AdvancePaymentApproval[]>(
      '/advance-payment-approvals/all',
    );
    return data;
  },

  /**
   * Obtener solicitudes propias del usuario
   */
  findMy: async () => {
    const { data } = await axiosInstance.get<AdvancePaymentApproval[]>(
      '/advance-payment-approvals/my',
    );
    return data;
  },

  /**
   * Aprobar solicitud de anticipo
   */
  approve: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<AdvancePaymentApproval>(
      `/advance-payment-approvals/${requestId}/approve`,
      { reviewNotes },
    );
    return data;
  },

  /**
   * Rechazar solicitud de anticipo
   */
  reject: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<AdvancePaymentApproval>(
      `/advance-payment-approvals/${requestId}/reject`,
      { reviewNotes },
    );
    return data;
  },
};
