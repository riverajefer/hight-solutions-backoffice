import axiosInstance from './axios';
import type {
  ExpenseOrderAuthRequest,
  CreateExpenseOrderAuthRequestDto,
} from '../types/expense-order-auth-request.types';

export const expenseOrderAuthRequestsApi = {
  /**
   * Crear solicitud de autorización de OG
   */
  create: async (dto: CreateExpenseOrderAuthRequestDto) => {
    const { data } = await axiosInstance.post<ExpenseOrderAuthRequest>(
      '/expense-order-auth-requests',
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes pendientes (solo admins)
   */
  findPending: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderAuthRequest[]>(
      '/expense-order-auth-requests/pending',
    );
    return data;
  },

  /**
   * Obtener todas las solicitudes (solo admins)
   */
  findAll: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderAuthRequest[]>(
      '/expense-order-auth-requests/all',
    );
    return data;
  },

  /**
   * Obtener solicitudes propias del usuario
   */
  findMy: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderAuthRequest[]>(
      '/expense-order-auth-requests/my',
    );
    return data;
  },

  /**
   * Aprobar solicitud (solo admins)
   */
  approve: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<ExpenseOrderAuthRequest>(
      `/expense-order-auth-requests/${requestId}/approve`,
      { reviewNotes },
    );
    return data;
  },

  /**
   * Rechazar solicitud (solo admins)
   */
  reject: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<ExpenseOrderAuthRequest>(
      `/expense-order-auth-requests/${requestId}/reject`,
      { reviewNotes },
    );
    return data;
  },
};
