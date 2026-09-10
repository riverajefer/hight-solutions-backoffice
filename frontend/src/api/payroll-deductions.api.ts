import axiosInstance from './axios';
import type {
  ApplyPayrollDeductionDto,
  PaginatedPayrollDeductions,
  PayrollDeduction,
  PayrollDeductionFilters,
} from '../types/payroll-deduction.types';

export const payrollDeductionsApi = {
  getAll: async (
    filters: PayrollDeductionFilters = {},
  ): Promise<PaginatedPayrollDeductions> => {
    const { data } = await axiosInstance.get<PaginatedPayrollDeductions>(
      '/payroll-deductions',
      { params: filters },
    );
    return data;
  },

  getById: async (id: string): Promise<PayrollDeduction> => {
    const { data } = await axiosInstance.get<PayrollDeduction>(
      `/payroll-deductions/${id}`,
    );
    return data;
  },

  /** Descuentos aprobados que le faltan por aplicar a un empleado. */
  getApprovedForEmployee: async (
    employeeId: string,
  ): Promise<PayrollDeduction[]> => {
    const { data } = await axiosInstance.get<PayrollDeduction[]>(
      `/payroll-deductions/employee/${employeeId}/approved`,
    );
    return data;
  },

  approve: async (id: string): Promise<PayrollDeduction> => {
    const { data } = await axiosInstance.put<PayrollDeduction>(
      `/payroll-deductions/${id}/approve`,
    );
    return data;
  },

  reject: async (
    id: string,
    rejectionReason: string,
  ): Promise<PayrollDeduction> => {
    const { data } = await axiosInstance.put<PayrollDeduction>(
      `/payroll-deductions/${id}/reject`,
      { rejectionReason },
    );
    return data;
  },

  apply: async (
    id: string,
    dto: ApplyPayrollDeductionDto,
  ): Promise<PayrollDeduction> => {
    const { data } = await axiosInstance.post<PayrollDeduction>(
      `/payroll-deductions/${id}/apply`,
      dto,
    );
    return data;
  },

  cancel: async (
    id: string,
    cancelReason: string,
  ): Promise<PayrollDeduction> => {
    const { data } = await axiosInstance.put<PayrollDeduction>(
      `/payroll-deductions/${id}/cancel`,
      { cancelReason },
    );
    return data;
  },
};
