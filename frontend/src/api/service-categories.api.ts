import axiosInstance from './axios';
import {
  ServiceCategory,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  ServiceCategoryListResponse,
} from '../types/service-category.types';

export interface ServiceCategoryQueryParams {
  includeInactive?: boolean;
}

export const serviceCategoriesApi = {
  /**
   * Get all service categories
   */
  getAll: async (
    params?: ServiceCategoryQueryParams
  ): Promise<ServiceCategoryListResponse> => {
    const response = await axiosInstance.get<ServiceCategoryListResponse>(
      '/service-categories',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single service category by ID
   */
  getById: async (id: string): Promise<ServiceCategory> => {
    const response = await axiosInstance.get<ServiceCategory>(
      `/service-categories/${id}`
    );
    return response.data;
  },

  /**
   * Create a new service category
   */
  create: async (data: CreateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await axiosInstance.post<ServiceCategory>(
      '/service-categories',
      data
    );
    return response.data;
  },

  /**
   * Update an existing service category
   */
  update: async (
    id: string,
    data: UpdateServiceCategoryDto
  ): Promise<ServiceCategory> => {
    const response = await axiosInstance.put<ServiceCategory>(
      `/service-categories/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a service category (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/service-categories/${id}`
    );
    return response.data;
  },
};
