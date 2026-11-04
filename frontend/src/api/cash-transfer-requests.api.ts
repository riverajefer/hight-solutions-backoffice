import axiosInstance from './axios';
import type {
  CashTransferPreview,
  CashTransferRequest,
  CreateCashTransferRequestDto,
  ReviewCashTransferRequestDto,
} from '../types/cash-transfer-request.types';

export const cashTransferRequestsApi = {
  preview: async (movementId: string) => {
    const { data } = await axiosInstance.get<CashTransferPreview>(
      `/cash-movements/${movementId}/transfer-requests/preview`,
    );
    return data;
  },

  create: async (movementId: string, dto: CreateCashTransferRequestDto) => {
    const { data } = await axiosInstance.post<CashTransferRequest>(
      `/cash-movements/${movementId}/transfer-requests`,
      dto,
    );
    return data;
  },

  getPending: async () => {
    const { data } = await axiosInstance.get<CashTransferRequest[]>(
      '/cash-movement-transfer-requests/pending',
    );
    return data;
  },

  getAll: async () => {
    const { data } = await axiosInstance.get<CashTransferRequest[]>(
      '/cash-movement-transfer-requests/all',
    );
    return data;
  },

  getBySession: async (sessionId: string) => {
    const { data } = await axiosInstance.get<CashTransferRequest[]>(
      `/cash-movement-transfer-requests/session/${sessionId}`,
    );
    return data;
  },

  getExpenseOrderMovements: async (expenseOrderId: string) => {
    const { data } = await axiosInstance.get<CashTransferPreview[]>(
      `/cash-movement-transfer-requests/expense-order/${expenseOrderId}`,
    );
    return data;
  },

  approve: async (requestId: string, dto: ReviewCashTransferRequestDto) => {
    const { data } = await axiosInstance.put<CashTransferRequest>(
      `/cash-movement-transfer-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  reject: async (requestId: string, dto: ReviewCashTransferRequestDto) => {
    const { data } = await axiosInstance.put<CashTransferRequest>(
      `/cash-movement-transfer-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
