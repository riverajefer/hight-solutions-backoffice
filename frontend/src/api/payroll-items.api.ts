import axiosInstance from './axios';
import type { PayrollItem, CreatePayrollItemDto, UpdatePayrollItemDto } from '../types';

export const payrollItemsApi = {
  getByPeriod: async (periodId: string): Promise<PayrollItem[]> => {
    const { data } = await axiosInstance.get<PayrollItem[]>(`/payroll/periods/${periodId}/items`);
    return data;
  },

  create: async (periodId: string, payload: CreatePayrollItemDto): Promise<PayrollItem> => {
    const { data } = await axiosInstance.post<PayrollItem>(
      `/payroll/periods/${periodId}/items`,
      payload,
    );
    return data;
  },

  update: async (
    periodId: string,
    itemId: string,
    payload: UpdatePayrollItemDto,
  ): Promise<PayrollItem> => {
    const { data } = await axiosInstance.put<PayrollItem>(
      `/payroll/periods/${periodId}/items/${itemId}`,
      payload,
    );
    return data;
  },

  delete: async (periodId: string, itemId: string): Promise<void> => {
    await axiosInstance.delete(`/payroll/periods/${periodId}/items/${itemId}`);
  },
};
