import axiosInstance from './axios';
import {
  Supplier,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryParams,
  SupplierListResponse,
} from '../types';

export const suppliersApi = {
  /**
   * Get all suppliers
   */
  getAll: async (params?: SupplierQueryParams): Promise<SupplierListResponse> => {
    const response = await axiosInstance.get<SupplierListResponse>('/suppliers', {
      params,
    });
    return response.data;
  },

  /**
   * Get supplier by ID
   */
  getById: async (id: string): Promise<Supplier> => {
    const response = await axiosInstance.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  /**
   * Create a new supplier
   */
  create: async (data: CreateSupplierDto): Promise<Supplier> => {
    const response = await axiosInstance.post<Supplier>('/suppliers', data);
    return response.data;
  },

  /**
   * Update a supplier
   */
  update: async (id: string, data: UpdateSupplierDto): Promise<Supplier> => {
    const response = await axiosInstance.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a supplier (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/suppliers/${id}`
    );
    return response.data;
  },
};
