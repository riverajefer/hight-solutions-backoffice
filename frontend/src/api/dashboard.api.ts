import axiosInstance from './axios';
import { FinancialDashboardResponse, FinancialQueryParams } from '../types/dashboard.types';

export const dashboardApi = {
  getFinancial: async (params?: FinancialQueryParams): Promise<FinancialDashboardResponse> => {
    const { data } = await axiosInstance.get('/dashboard/financial', { params });
    return data;
  },
};
