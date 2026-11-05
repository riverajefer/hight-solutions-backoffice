import axiosInstance from './axios';
import {
  CommercialDashboardResponse,
  CommercialQueryParams,
  FinancialDashboardResponse,
  FinancialQueryParams,
} from '../types/dashboard.types';

export const dashboardApi = {
  getFinancial: async (params?: FinancialQueryParams): Promise<FinancialDashboardResponse> => {
    const { data } = await axiosInstance.get('/dashboard/financial', { params });
    return data;
  },

  getCommercial: async (params?: CommercialQueryParams): Promise<CommercialDashboardResponse> => {
    const { data } = await axiosInstance.get('/dashboard/commercial', { params });
    return data;
  },
};
