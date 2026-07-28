import axiosInstance from './axios';
import type {
  ClientAdvisorRequest,
  CreateClientAdvisorRequestDto,
  ApproveClientAdvisorRequestDto,
  RejectClientAdvisorRequestDto,
} from '../types/client-advisor-request.types';

export const clientAdvisorRequestsApi = {
  create: async (
    dto: CreateClientAdvisorRequestDto,
  ): Promise<ClientAdvisorRequest> => {
    const { data } = await axiosInstance.post('/client-advisor-requests', dto);
    return data;
  },

  findPending: async (): Promise<ClientAdvisorRequest[]> => {
    const { data } = await axiosInstance.get('/client-advisor-requests/pending');
    return data;
  },

  findAll: async (): Promise<ClientAdvisorRequest[]> => {
    const { data } = await axiosInstance.get('/client-advisor-requests/all');
    return data;
  },

  findMyRequests: async (): Promise<ClientAdvisorRequest[]> => {
    const { data } = await axiosInstance.get(
      '/client-advisor-requests/my-requests',
    );
    return data;
  },

  findByClient: async (clientId: string): Promise<ClientAdvisorRequest[]> => {
    const { data } = await axiosInstance.get(
      `/client-advisor-requests/client/${clientId}`,
    );
    return data;
  },

  approve: async (
    requestId: string,
    dto: ApproveClientAdvisorRequestDto,
  ): Promise<ClientAdvisorRequest> => {
    const { data } = await axiosInstance.put(
      `/client-advisor-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  reject: async (
    requestId: string,
    dto: RejectClientAdvisorRequestDto,
  ): Promise<ClientAdvisorRequest> => {
    const { data } = await axiosInstance.put(
      `/client-advisor-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
