import axiosInstance from './axios';
import {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
  ServiceListResponse,
} from '../types/service.types';

export interface ServiceQueryParams {
  includeInactive?: boolean;
  categoryId?: string;
}

export const servicesApi = {
  /**
   * Get all services
   */
  getAll: async (
    params?: ServiceQueryParams
  ): Promise<ServiceListResponse> => {
    const response = await axiosInstance.get<ServiceListResponse>(
      '/services',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single service by ID
   */
  getById: async (id: string): Promise<Service> => {
    const response = await axiosInstance.get<Service>(
      `/services/${id}`
    );
    return response.data;
  },

  /**
   * Create a new service
   */
  create: async (data: CreateServiceDto): Promise<Service> => {
    const response = await axiosInstance.post<Service>(
      '/services',
      data
    );
    return response.data;
  },

  /**
   * Update an existing service
   */
  update: async (
    id: string,
    data: UpdateServiceDto
  ): Promise<Service> => {
    const response = await axiosInstance.put<Service>(
      `/services/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a service (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/services/${id}`
    );
    return response.data;
  },
};
