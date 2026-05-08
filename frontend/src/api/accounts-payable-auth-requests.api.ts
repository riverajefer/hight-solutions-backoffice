import axiosInstance from './axios';
import type {
  AccountPayableAuthRequest,
  CreateApAuthRequestDto,
} from '../types/accounts-payable.types';

export const accountsPayableAuthRequestsApi = {
  create: (dto: CreateApAuthRequestDto): Promise<AccountPayableAuthRequest> =>
    axiosInstance.post('/accounts-payable-auth-requests', dto).then((r) => r.data),

  findPending: (): Promise<AccountPayableAuthRequest[]> =>
    axiosInstance.get('/accounts-payable-auth-requests/pending').then((r) => r.data),

  findAll: (): Promise<AccountPayableAuthRequest[]> =>
    axiosInstance.get('/accounts-payable-auth-requests/all').then((r) => r.data),

  findByUser: (): Promise<AccountPayableAuthRequest[]> =>
    axiosInstance.get('/accounts-payable-auth-requests/my').then((r) => r.data),

  approve: (id: string, reviewNotes?: string): Promise<AccountPayableAuthRequest> =>
    axiosInstance.patch(`/accounts-payable-auth-requests/${id}/approve`, { reviewNotes }).then((r) => r.data),

  reject: (id: string, reviewNotes?: string): Promise<AccountPayableAuthRequest> =>
    axiosInstance.patch(`/accounts-payable-auth-requests/${id}/reject`, { reviewNotes }).then((r) => r.data),
};
