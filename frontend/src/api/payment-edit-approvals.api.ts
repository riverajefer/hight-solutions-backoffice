import axiosInstance from './axios';
import type { PaymentEditApproval } from '../types/order.types';

const BASE_URL = '/payment-edit-approvals';

export const paymentEditApprovalsApi = {
  /** Solicitudes de edición de pago de una orden (cualquier estado). */
  getByOrder: async (orderId: string): Promise<PaymentEditApproval[]> => {
    const { data } = await axiosInstance.get<PaymentEditApproval[]>(
      `${BASE_URL}/order/${orderId}`
    );
    return data;
  },

  /** Solicitudes pendientes (dashboard de aprobación). */
  getPending: async (): Promise<PaymentEditApproval[]> => {
    const { data } = await axiosInstance.get<PaymentEditApproval[]>(
      `${BASE_URL}/pending`
    );
    return data;
  },

  /** Alias usado por la vista de Solicitudes (modo pendientes). */
  findPending: async (): Promise<PaymentEditApproval[]> => {
    const { data } = await axiosInstance.get<PaymentEditApproval[]>(
      `${BASE_URL}/pending`
    );
    return data;
  },

  /** Todas las solicitudes (historial). */
  findAll: async (): Promise<PaymentEditApproval[]> => {
    const { data } = await axiosInstance.get<PaymentEditApproval[]>(
      `${BASE_URL}/all`
    );
    return data;
  },

  approve: async (
    id: string,
    reviewNotes?: string
  ): Promise<PaymentEditApproval> => {
    const { data } = await axiosInstance.put<PaymentEditApproval>(
      `${BASE_URL}/${id}/approve`,
      { reviewNotes }
    );
    return data;
  },

  reject: async (
    id: string,
    reviewNotes?: string
  ): Promise<PaymentEditApproval> => {
    const { data } = await axiosInstance.put<PaymentEditApproval>(
      `${BASE_URL}/${id}/reject`,
      { reviewNotes }
    );
    return data;
  },
};
