import axiosInstance from './axios';
import {
  UnitOfMeasure,
  CreateUnitOfMeasureDto,
  UpdateUnitOfMeasureDto,
  UnitOfMeasureListResponse,
} from '../types/unit-of-measure.types';

export interface UnitOfMeasureQueryParams {
  includeInactive?: boolean;
}

export const unitsOfMeasureApi = {
  /**
   * Get all units of measure
   */
  getAll: async (
    params?: UnitOfMeasureQueryParams
  ): Promise<UnitOfMeasureListResponse> => {
    const response = await axiosInstance.get<UnitOfMeasureListResponse>(
      '/units-of-measure',
      { params }
    );
    return response.data;
  },

  /**
   * Get a single unit of measure by ID
   */
  getById: async (id: string): Promise<UnitOfMeasure> => {
    const response = await axiosInstance.get<UnitOfMeasure>(
      `/units-of-measure/${id}`
    );
    return response.data;
  },

  /**
   * Create a new unit of measure
   */
  create: async (data: CreateUnitOfMeasureDto): Promise<UnitOfMeasure> => {
    const response = await axiosInstance.post<UnitOfMeasure>(
      '/units-of-measure',
      data
    );
    return response.data;
  },

  /**
   * Update an existing unit of measure
   */
  update: async (
    id: string,
    data: UpdateUnitOfMeasureDto
  ): Promise<UnitOfMeasure> => {
    const response = await axiosInstance.put<UnitOfMeasure>(
      `/units-of-measure/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a unit of measure (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/units-of-measure/${id}`
    );
    return response.data;
  },
};
