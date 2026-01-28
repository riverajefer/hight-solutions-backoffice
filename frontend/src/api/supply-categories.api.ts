import axiosInstance from './axios';
import {
  SupplyCategory,
  CreateSupplyCategoryDto,
  UpdateSupplyCategoryDto,
  SupplyCategoryListResponse,
} from '../types/supply-category.types';

export interface SupplyCategoryQueryParams {
  includeInactive?: boolean;
}

export const supplyCategoriesApi = {
  /**
   * Get all supply categories
   */
  getAll: async (
    params?: SupplyCategoryQueryParams
  ): Promise<SupplyCategoryListResponse> => {
    const response = await axiosInstance.get<SupplyCategoryListResponse>(
      '/supply-categories',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single supply category by ID
   */
  getById: async (id: string): Promise<SupplyCategory> => {
    const response = await axiosInstance.get<SupplyCategory>(
      `/supply-categories/${id}`
    );
    return response.data;
  },

  /**
   * Create a new supply category
   */
  create: async (data: CreateSupplyCategoryDto): Promise<SupplyCategory> => {
    const response = await axiosInstance.post<SupplyCategory>(
      '/supply-categories',
      data
    );
    return response.data;
  },

  /**
   * Update an existing supply category
   */
  update: async (
    id: string,
    data: UpdateSupplyCategoryDto
  ): Promise<SupplyCategory> => {
    const response = await axiosInstance.put<SupplyCategory>(
      `/supply-categories/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a supply category (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/supply-categories/${id}`
    );
    return response.data;
  },
};
