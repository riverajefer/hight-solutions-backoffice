import axiosInstance from './axios';
import type {
  CreateExpenseOrderReductionDto,
  ExpenseOrderReductionPlan,
  ExpenseOrderReductionRequest,
  RegisterReductionRefundDto,
} from '../types/expense-order-reduction.types';

export const expenseOrderReductionRequestsApi = {
  preview: async (expenseOrderId: string, dto: Omit<CreateExpenseOrderReductionDto, 'reason'>) => {
    const { data } = await axiosInstance.post<ExpenseOrderReductionPlan>(
      `/expense-orders/${expenseOrderId}/reduction-requests/preview`,
      dto,
    );
    return data;
  },

  getByExpenseOrder: async (expenseOrderId: string) => {
    const { data } = await axiosInstance.get<ExpenseOrderReductionRequest[]>(
      `/expense-orders/${expenseOrderId}/reduction-requests`,
    );
    return data;
  },

  create: async (expenseOrderId: string, dto: CreateExpenseOrderReductionDto) => {
    const { data } = await axiosInstance.post<ExpenseOrderReductionRequest>(
      `/expense-orders/${expenseOrderId}/reduction-requests`,
      dto,
    );
    return data;
  },

  getPending: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderReductionRequest[]>(
      '/expense-order-reduction-requests/pending',
    );
    return data;
  },

  getAll: async () => {
    const { data } = await axiosInstance.get<ExpenseOrderReductionRequest[]>('/expense-order-reduction-requests/all');
    return data;
  },

  approve: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<ExpenseOrderReductionRequest>(
      `/expense-order-reduction-requests/${requestId}/approve`,
      { reviewNotes },
    );
    return data;
  },

  reject: async (requestId: string, reviewNotes?: string) => {
    const { data } = await axiosInstance.put<ExpenseOrderReductionRequest>(
      `/expense-order-reduction-requests/${requestId}/reject`,
      { reviewNotes },
    );
    return data;
  },

  registerRefund: async (requestId: string, dto: RegisterReductionRefundDto) => {
    const { data } = await axiosInstance.post<ExpenseOrderReductionRequest>(
      `/expense-order-reduction-requests/${requestId}/refund`,
      dto,
    );
    return data;
  },
};
