import axiosInstance from './axios';
import type {
  AccountPayablePaymentReversalRequest,
  CajaRejectApPaymentReversalDto,
  CreateApPaymentReversalRequestDto,
  GerenciaRejectApPaymentReversalDto,
} from '../types/accounts-payable-payment-reversal.types';

const BASE = '/accounts-payable-payment-reversal-requests';

export const apPaymentReversalRequestsApi = {
  create: async (dto: CreateApPaymentReversalRequestDto): Promise<AccountPayablePaymentReversalRequest> => {
    const { data } = await axiosInstance.post(BASE, dto);
    return data;
  },

  findPendingGerencia: async (): Promise<AccountPayablePaymentReversalRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/pending-gerencia`);
    return data;
  },

  findPendingCaja: async (): Promise<AccountPayablePaymentReversalRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/pending-caja`);
    return data;
  },

  findAll: async (): Promise<AccountPayablePaymentReversalRequest[]> => {
    const { data } = await axiosInstance.get(`${BASE}/all`);
    return data;
  },

  findOne: async (id: string): Promise<AccountPayablePaymentReversalRequest> => {
    const { data } = await axiosInstance.get(`${BASE}/${id}`);
    return data;
  },

  findByPaymentAuthRequest: async (paymentAuthRequestId: string): Promise<AccountPayablePaymentReversalRequest | null> => {
    const { data } = await axiosInstance.get(`${BASE}/by-payment-auth-request/${paymentAuthRequestId}`);
    return data;
  },

  gerenciaApprove: async (id: string): Promise<AccountPayablePaymentReversalRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/gerencia-approve`);
    return data;
  },

  gerenciaReject: async (id: string, dto: GerenciaRejectApPaymentReversalDto): Promise<AccountPayablePaymentReversalRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/gerencia-reject`, dto);
    return data;
  },

  cajaApprove: async (id: string): Promise<{ success: boolean; reversalId: string; accountPayableId: string }> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/caja-approve`);
    return data;
  },

  cajaReject: async (id: string, dto: CajaRejectApPaymentReversalDto): Promise<AccountPayablePaymentReversalRequest> => {
    const { data } = await axiosInstance.patch(`${BASE}/${id}/caja-reject`, dto);
    return data;
  },
};
