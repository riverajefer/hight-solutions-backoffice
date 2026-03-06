import axiosInstance from './axios';
import type {
  PayrollEmployee,
  CreatePayrollEmployeeDto,
  UpdatePayrollEmployeeDto,
} from '../types';
import type { PayrollItem } from '../types/payroll-item.types';

export const payrollEmployeesApi = {
  getAll: async (): Promise<PayrollEmployee[]> => {
    const { data } = await axiosInstance.get<PayrollEmployee[]>('/payroll/employees');
    return data;
  },

  getById: async (id: string): Promise<PayrollEmployee> => {
    const { data } = await axiosInstance.get<PayrollEmployee>(`/payroll/employees/${id}`);
    return data;
  },

  getHistory: async (id: string): Promise<PayrollItem[]> => {
    const { data } = await axiosInstance.get<PayrollItem[]>(`/payroll/employees/${id}/history`);
    return data;
  },

  create: async (payload: CreatePayrollEmployeeDto): Promise<PayrollEmployee> => {
    const { data } = await axiosInstance.post<PayrollEmployee>('/payroll/employees', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePayrollEmployeeDto): Promise<PayrollEmployee> => {
    const { data } = await axiosInstance.put<PayrollEmployee>(`/payroll/employees/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/payroll/employees/${id}`);
  },
};
