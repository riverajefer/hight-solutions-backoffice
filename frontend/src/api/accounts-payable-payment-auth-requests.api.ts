import axiosInstance from './axios';
import type {
  AccountPayablePaymentAuthRequest,
  AdminApproveApPaymentAuthRequestDto,
  AdminRejectApPaymentAuthRequestDto,
  CajaRejectApPaymentAuthRequestDto,
  CreateApPaymentAuthRequestDto,
} from '../types/accounts-payable.types';

const BASE = '/accounts-payable-payment-auth-requests';

export const apPaymentAuthRequestsApi = {
  create: async (dto: CreateApPaymentAuthRequestDto): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.post(BASE, dto);
    return data;
  },

  findPendingAdmin: async (): Promise<AccountPayablePaymentAuthRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/pending-admin`);
    return data;
  },

  findPendingCaja: async (): Promise<AccountPayablePaymentAuthRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/pending-caja`);
    return data;
  },

  findAll: async (): Promise<AccountPayablePaymentAuthRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/all`);
    return data;
  },

  findByUser: async (): Promise<AccountPayablePaymentAuthRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/my`);
    return data;
  },

  findByAccountPayable: async (accountPayableId: string): Promise<AccountPayablePaymentAuthRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/by-account-payable/${accountPayableId}`);
    return data;
  },

  findOne: async (id: string): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.get(`${BASE}/${id}`);
    return data;
  },

  adminApprove: async (id: string, dto: AdminApproveApPaymentAuthRequestDto): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/admin-approve`, dto);
    return data;
  },

  adminReject: async (id: string, dto: AdminRejectApPaymentAuthRequestDto): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/admin-reject`, dto);
    return data;
  },

  cajaApprove: async (id: string): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/caja-approve`);
    return data;
  },

  cajaReject: async (id: string, dto: CajaRejectApPaymentAuthRequestDto): Promise<AccountPayablePaymentAuthRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/caja-reject`, dto);
    return data;
  },
};
