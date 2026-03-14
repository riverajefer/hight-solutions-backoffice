import axiosInstance from './axios';
import type {
  ClientOwnershipAuthRequest,
  ApproveClientOwnershipAuthRequestDto,
  RejectClientOwnershipAuthRequestDto,
} from '../types/client-ownership-auth-request.types';

export const clientOwnershipAuthRequestsApi = {
  findPending: async (): Promise<ClientOwnershipAuthRequest[]> => {
    const { data } = await axiosInstance.get('/client-ownership-auth-requests/pending');
    return data;
  },

  findAll: async (): Promise<ClientOwnershipAuthRequest[]> => {
    const { data } = await axiosInstance.get('/client-ownership-auth-requests/all');
    return data;
  },

  findMyRequests: async (): Promise<ClientOwnershipAuthRequest[]> => {
    const { data } = await axiosInstance.get('/client-ownership-auth-requests/my');
    return data;
  },

  approve: async (
    requestId: string,
    dto: ApproveClientOwnershipAuthRequestDto,
  ): Promise<ClientOwnershipAuthRequest> => {
    const { data } = await axiosInstance.put(
      `/client-ownership-auth-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  reject: async (
    requestId: string,
    dto: RejectClientOwnershipAuthRequestDto,
  ): Promise<ClientOwnershipAuthRequest> => {
    const { data } = await axiosInstance.put(
      `/client-ownership-auth-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
