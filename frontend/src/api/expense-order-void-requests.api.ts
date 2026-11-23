import axiosInstance from './axios';
import type {
  CreateExpenseOrderVoidRequestDto,
  ExpenseOrderVoidPlan,
  ExpenseOrderVoidRequest,
  ReviewExpenseOrderVoidRequestDto,
} from '../types/expense-order-void-request.types';

export const expenseOrderVoidRequestsApi = {
  preview: async (expenseOrderId: string) => {
    const { data } = await axiosInstance.get<ExpenseOrderVoidPlan>(
      `/expense-orders/${expenseOrderId}/void-requests/preview`,
    );
    return data;
  },

  getByExpenseOrder: async (expenseOrderId: string) => {
    const { data } = await axiosInstance.get<ExpenseOrderVoidRequest[]>(
      `/expense-orders/${expenseOrderId}/void-requests`,
    );
    return data;
  },

  create: async (expenseOrderId: string, dto: CreateExpenseOrderVoidRequestDto) => {
    const { data } = await axiosInstance.post<ExpenseOrderVoidRequest>(
      `/expense-orders/${expenseOrderId}/void-requests`,
      dto,
    );
    return data;
  },

  getPending: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderVoidRequest[]>('/expense-order-void-requests/pending');
    return data;
  },

  getAll: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderVoidRequest[]>('/expense-order-void-requests/all');
    return data;
  },

  approve: async (requestId: string, dto: ReviewExpenseOrderVoidRequestDto) => {
    const { data } = await axiosInstance.put<ExpenseOrderVoidRequest>(
      `/expense-order-void-requests/${requestId}/approve`,
      dto,
    );
    return data;
  },

  reject: async (requestId: string, dto: ReviewExpenseOrderVoidRequestDto) => {
    const { data } = await axiosInstance.put<ExpenseOrderVoidRequest>(
      `/expense-order-void-requests/${requestId}/reject`,
      dto,
    );
    return data;
  },
};
