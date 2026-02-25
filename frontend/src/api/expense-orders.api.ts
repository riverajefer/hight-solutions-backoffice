import axiosInstance from './axios';
import type {
  ExpenseOrder,
  ExpenseOrdersListResponse,
  ExpenseType,
  ExpenseSubcategory,
  CreateExpenseItemDto,
  CreateExpenseOrderDto,
  UpdateExpenseOrderDto,
  UpdateExpenseOrderStatusDto,
  FilterExpenseOrdersDto,
} from '../types/expense-order.types';

export const expenseOrdersApi = {
  // ─── Expense Types & Subcategories ──────────────────────────────────────────

  getTypes: async (): Promise<ExpenseType[]> => {
    const response = await axiosInstance.get<ExpenseType[]>('/expense-types');
    return response.data;
  },

  getSubcategories: async (expenseTypeId?: string): Promise<ExpenseSubcategory[]> => {
    const response = await axiosInstance.get<ExpenseSubcategory[]>(
      '/expense-types/subcategories/all',
      { params: expenseTypeId ? { expenseTypeId } : undefined },
    );
    return response.data;
  },

  // ─── Expense Orders CRUD ────────────────────────────────────────────────────

  getAll: async (params?: FilterExpenseOrdersDto): Promise<ExpenseOrdersListResponse> => {
    const response = await axiosInstance.get<ExpenseOrdersListResponse>('/expense-orders', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ExpenseOrder> => {
    const response = await axiosInstance.get<ExpenseOrder>(`/expense-orders/${id}`);
    return response.data;
  },

  create: async (dto: CreateExpenseOrderDto, confirmed = false): Promise<ExpenseOrder> => {
    const response = await axiosInstance.post<ExpenseOrder>(
      '/expense-orders',
      dto,
      confirmed ? { params: { status: 'CREATED' } } : undefined,
    );
    return response.data;
  },

  update: async (id: string, dto: UpdateExpenseOrderDto): Promise<ExpenseOrder> => {
    const response = await axiosInstance.patch<ExpenseOrder>(`/expense-orders/${id}`, dto);
    return response.data;
  },

  updateStatus: async (
    id: string,
    dto: UpdateExpenseOrderStatusDto,
  ): Promise<ExpenseOrder> => {
    const response = await axiosInstance.patch<ExpenseOrder>(
      `/expense-orders/${id}/status`,
      dto,
    );
    return response.data;
  },

  addItem: async (id: string, dto: CreateExpenseItemDto): Promise<ExpenseOrder> => {
    const response = await axiosInstance.post<ExpenseOrder>(`/expense-orders/${id}/items`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/expense-orders/${id}`);
  },
};
