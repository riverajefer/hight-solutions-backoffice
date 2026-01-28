import axiosInstance from './axios';
import {
  Supply,
  CreateSupplyDto,
  UpdateSupplyDto,
  SupplyListResponse,
} from '../types/supply.types';

export interface SupplyQueryParams {
  includeInactive?: boolean;
  categoryId?: string;
}

export const suppliesApi = {
  /**
   * Get all supplies
   */
  getAll: async (
    params?: SupplyQueryParams
  ): Promise<SupplyListResponse> => {
    const response = await axiosInstance.get<SupplyListResponse>(
      '/supplies',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single supply by ID
   */
  getById: async (id: string): Promise<Supply> => {
    const response = await axiosInstance.get<Supply>(
      `/supplies/${id}`
    );
    return response.data;
  },

  /**
   * Create a new supply
   */
  create: async (data: CreateSupplyDto): Promise<Supply> => {
    const response = await axiosInstance.post<Supply>(
      '/supplies',
      data
    );
    return response.data;
  },

  /**
   * Update an existing supply
   */
  update: async (
    id: string,
    data: UpdateSupplyDto
  ): Promise<Supply> => {
    const response = await axiosInstance.put<Supply>(
      `/supplies/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a supply (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/supplies/${id}`
    );
    return response.data;
  },
};
