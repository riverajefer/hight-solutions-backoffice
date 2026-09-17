import axiosInstance from './axios';
import type {
  QuoteRestoreRequest,
  CreateQuoteRestoreRequestDto,
  ApproveQuoteRestoreRequestDto,
  RejectQuoteRestoreRequestDto,
} from '../types/quote-restore-request.types';

export const quoteRestoreRequestsApi = {
  /**
   * Solicitar la restauración de una cotización rechazada
   */
  create: async (dto: CreateQuoteRestoreRequestDto) => {
    const { data } = await axiosInstance.post<QuoteRestoreRequest>(
      '/quote-restore-requests',
      dto,
    );
    return data;
  },

  /**
   * Restaurar directamente (solo admins, sin solicitud)
   */
  restoreDirectly: async (dto: CreateQuoteRestoreRequestDto) => {
    const { data } = await axiosInstance.put<QuoteRestoreRequest>(
      '/quote-restore-requests/direct',
      dto,
    );
    return data;
  },

  /**
   * Obtener solicitudes pendientes (solo admins)
   */
  findPending: async (quoteId?: string) => {
    const { data } = await axiosInstance.get<QuoteRestoreRequest[]>(
      '/quote-restore-requests/pending',
      { params: { quoteId } },
    );
    return data;
  },

  /**
   * Obtener todas las solicitudes (solo admins)
   */
  findAll: async (quoteId?: string) => {
    const { data } = await axiosInstance.get<QuoteRestoreRequest[]>(
      '/quote-restore-requests/all',
      { params: { quoteId } },
    );
    return data;
  },

  /**
   * Obtener la solicitud pendiente de una cotización (o null)
   */
  findByQuote: async (quoteId: string) => {
    const { data } = await axiosInstance.get<QuoteRestoreRequest | null>(
      `/quote-restore-requests/quote/${quoteId}`,
    );
    return data;
  },

  /**
   * Aprobar solicitud (solo admins) — restaura la cotización
   */
  approve: async (requestId: string, dto: ApproveQuoteRestoreRequestDto) => {
    const { data } = await axiosInstance.put<QuoteRestoreRequest>(
      `/quote-restore-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  /**
   * Rechazar solicitud (solo admins)
   */
  reject: async (requestId: string, dto: RejectQuoteRestoreRequestDto) => {
    const { data } = await axiosInstance.put<QuoteRestoreRequest>(
      `/quote-restore-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
