import axiosInstance from './axios';
import type {
  PayrollPeriod,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  PayrollPeriodSummary,
} from '../types';

export const payrollPeriodsApi = {
  getAll: async (): Promise<PayrollPeriod[]> => {
    const { data } = await axiosInstance.get<PayrollPeriod[]>('/payroll/periods');
    return data;
  },

  getById: async (id: string): Promise<PayrollPeriod> => {
    const { data } = await axiosInstance.get<PayrollPeriod>(`/payroll/periods/${id}`);
    return data;
  },

  getSummary: async (id: string): Promise<PayrollPeriodSummary> => {
    const { data } = await axiosInstance.get<PayrollPeriodSummary>(`/payroll/periods/${id}/summary`);
    return data;
  },

  create: async (payload: CreatePayrollPeriodDto): Promise<PayrollPeriod> => {
    const { data } = await axiosInstance.post<PayrollPeriod>('/payroll/periods', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePayrollPeriodDto): Promise<PayrollPeriod> => {
    const { data } = await axiosInstance.put<PayrollPeriod>(`/payroll/periods/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/payroll/periods/${id}`);
  },

  generateItems: async (id: string): Promise<{ message: string; count: number }> => {
    const { data } = await axiosInstance.post<{ message: string; count: number }>(
      `/payroll/periods/${id}/generate`,
    );
    return data;
  },
};
