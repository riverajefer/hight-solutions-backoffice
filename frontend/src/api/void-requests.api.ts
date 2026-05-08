import axiosInstance from './axios';
import type {
  CashMovementVoidRequest,
  CreateVoidRequestDto,
  ReviewVoidRequestDto,
} from '../types/void-request.types';

export const voidRequestsApi = {
  create: async (movementId: string, dto: CreateVoidRequestDto) => {
    const { data } = await axiosInstance.post<CashMovementVoidRequest>(
      `/cash-movements/${movementId}/void-requests`,
      dto,
    );
    return data;
  },

  getPending: async () => {
    const { data } = await axiosInstance.get<CashMovementVoidRequest[]>(
      '/cash-movement-void-requests/pending',
    );
    return data;
  },

  getAll: async () => {
    const { data } = await axiosInstance.get<CashMovementVoidRequest[]>(
      '/cash-movement-void-requests/all',
    );
    return data;
  },

  approve: async (requestId: string, dto: ReviewVoidRequestDto) => {
    const { data } = await axiosInstance.put<CashMovementVoidRequest>(
      `/cash-movement-void-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  reject: async (requestId: string, dto: ReviewVoidRequestDto) => {
    const { data } = await axiosInstance.put<CashMovementVoidRequest>(
      `/cash-movement-void-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
