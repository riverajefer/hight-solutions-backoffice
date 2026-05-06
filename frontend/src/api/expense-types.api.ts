import axiosInstance from './axios';
import {
  ExpenseType,
  ExpenseSubcategory,
  ExpenseTypeListResponse,
  ExpenseSubcategoryListResponse,
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
  CreateExpenseSubcategoryDto,
  UpdateExpenseSubcategoryDto,
} from '../types/expense-type.types';

export const expenseTypesApi = {
  // ─── Expense Types ──────────────────────────────────────────────────────────

  getAll: async (): Promise<ExpenseTypeListResponse> => {
    const response = await axiosInstance.get<ExpenseTypeListResponse>('/expense-types');
    return response.data;
  },

  getById: async (id: string): Promise<ExpenseType> => {
    const response = await axiosInstance.get<ExpenseType>(`/expense-types/${id}`);
    return response.data;
  },

  create: async (data: CreateExpenseTypeDto): Promise<ExpenseType> => {
    const response = await axiosInstance.post<ExpenseType>('/expense-types', data);
    return response.data;
  },

  update: async (id: string, data: UpdateExpenseTypeDto): Promise<ExpenseType> => {
    const response = await axiosInstance.patch<ExpenseType>(`/expense-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/expense-types/${id}`);
  },

  // ─── Expense Subcategories ───────────────────────────────────────────────────

  getAllSubcategories: async (expenseTypeId?: string): Promise<ExpenseSubcategoryListResponse> => {
    const response = await axiosInstance.get<ExpenseSubcategoryListResponse>(
      '/expense-types/subcategories/all',
      { params: expenseTypeId ? { expenseTypeId } : undefined }
    );
    return response.data;
  },

  getSubcategoryById: async (id: string): Promise<ExpenseSubcategory> => {
    const response = await axiosInstance.get<ExpenseSubcategory>(
      `/expense-types/subcategories/${id}`
    );
    return response.data;
  },

  createSubcategory: async (data: CreateExpenseSubcategoryDto): Promise<ExpenseSubcategory> => {
    const response = await axiosInstance.post<ExpenseSubcategory>(
      '/expense-types/subcategories',
      data
    );
    return response.data;
  },

  updateSubcategory: async (
    id: string,
    data: UpdateExpenseSubcategoryDto
  ): Promise<ExpenseSubcategory> => {
    const response = await axiosInstance.patch<ExpenseSubcategory>(
      `/expense-types/subcategories/${id}`,
      data
    );
    return response.data;
  },

  deleteSubcategory: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/expense-types/subcategories/${id}`);
  },
};
