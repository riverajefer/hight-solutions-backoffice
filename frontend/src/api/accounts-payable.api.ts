import axiosInstance from './axios';
import type {
  AccountPayable,
  AccountPayableAttachment,
  AccountPayableInstallment,
  AccountPayableListResponse,
  AccountPayablePayment,
  AccountPayableSummary,
  CancelAccountPayableDto,
  CreateAccountPayableDto,
  CreateAttachmentDto,
  FilterAccountPayableDto,
  RegisterPaymentDto,
  SetInstallmentsDto,
  UpdateAccountPayableDto,
  UpdateInstallmentDto,
} from '../types/accounts-payable.types';

export const accountsPayableApi = {
  getAll: async (params?: FilterAccountPayableDto): Promise<AccountPayableListResponse> => {
    const response = await axiosInstance.get<AccountPayableListResponse>('/accounts-payable', {
      params,
    });
    return response.data;
  },

  getSummary: async (): Promise<AccountPayableSummary> => {
    const response = await axiosInstance.get<AccountPayableSummary>('/accounts-payable/summary');
    return response.data;
  },

  getById: async (id: string): Promise<AccountPayable> => {
    const response = await axiosInstance.get<AccountPayable>(`/accounts-payable/${id}`);
    return response.data;
  },

  create: async (dto: CreateAccountPayableDto): Promise<AccountPayable> => {
    const response = await axiosInstance.post<AccountPayable>('/accounts-payable', dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateAccountPayableDto): Promise<AccountPayable> => {
    const response = await axiosInstance.put<AccountPayable>(`/accounts-payable/${id}`, dto);
    return response.data;
  },

  cancel: async (id: string, dto: CancelAccountPayableDto): Promise<AccountPayable> => {
    const response = await axiosInstance.delete<AccountPayable>(`/accounts-payable/${id}`, {
      data: dto,
    });
    return response.data;
  },

  registerPayment: async (id: string, dto: RegisterPaymentDto): Promise<AccountPayablePayment> => {
    const response = await axiosInstance.post<AccountPayablePayment>(
      `/accounts-payable/${id}/payments`,
      dto,
    );
    return response.data;
  },

  getPayments: async (id: string): Promise<AccountPayablePayment[]> => {
    const response = await axiosInstance.get<AccountPayablePayment[]>(
      `/accounts-payable/${id}/payments`,
    );
    return response.data;
  },

  deletePayment: async (id: string, paymentId: string): Promise<void> => {
    await axiosInstance.delete(`/accounts-payable/${id}/payments/${paymentId}`);
  },

  // ─── Attachments ─────────────────────────────────────────────────────────────

  addAttachment: async (id: string, dto: CreateAttachmentDto): Promise<AccountPayableAttachment> => {
    const response = await axiosInstance.post<AccountPayableAttachment>(
      `/accounts-payable/${id}/attachments`,
      dto,
    );
    return response.data;
  },

  deleteAttachment: async (id: string, attachmentId: string): Promise<void> => {
    await axiosInstance.delete(`/accounts-payable/${id}/attachments/${attachmentId}`);
  },

  // ─── Installments ─────────────────────────────────────────────────────────────

  setInstallments: async (id: string, dto: SetInstallmentsDto): Promise<AccountPayableInstallment[]> => {
    const response = await axiosInstance.post<AccountPayableInstallment[]>(
      `/accounts-payable/${id}/installments`,
      dto,
    );
    return response.data;
  },

  getInstallments: async (id: string): Promise<AccountPayableInstallment[]> => {
    const response = await axiosInstance.get<AccountPayableInstallment[]>(
      `/accounts-payable/${id}/installments`,
    );
    return response.data;
  },

  toggleInstallmentPaid: async (
    id: string,
    installmentId: string,
    dto: UpdateInstallmentDto,
  ): Promise<AccountPayableInstallment> => {
    const response = await axiosInstance.patch<AccountPayableInstallment>(
      `/accounts-payable/${id}/installments/${installmentId}`,
      dto,
    );
    return response.data;
  },

  deleteInstallment: async (id: string, installmentId: string): Promise<void> => {
    await axiosInstance.delete(`/accounts-payable/${id}/installments/${installmentId}`);
  },
};
