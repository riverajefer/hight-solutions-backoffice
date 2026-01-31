import axiosInstance from './axios';
import {
  ProductionArea,
  CreateProductionAreaDto,
  UpdateProductionAreaDto,
  ProductionAreaListResponse,
} from '../types';

export interface ProductionAreaQueryParams {
  includeInactive?: boolean;
}

export const productionAreasApi = {
  /**
   * Listar todas las áreas de producción
   */
  getAll: async (params?: ProductionAreaQueryParams): Promise<ProductionAreaListResponse> => {
    const response = await axiosInstance.get<ProductionAreaListResponse>('/production-areas', { params });
    return response.data;
  },

  /**
   * Obtener área de producción por ID
   */
  getById: async (id: string): Promise<ProductionArea> => {
    const response = await axiosInstance.get<ProductionArea>(`/production-areas/${id}`);
    return response.data;
  },

  /**
   * Crear nueva área de producción
   */
  create: async (data: CreateProductionAreaDto): Promise<ProductionArea> => {
    const response = await axiosInstance.post<ProductionArea>('/production-areas', data);
    return response.data;
  },

  /**
   * Actualizar área de producción
   */
  update: async (id: string, data: UpdateProductionAreaDto): Promise<ProductionArea> => {
    const response = await axiosInstance.put<ProductionArea>(`/production-areas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar área de producción (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/production-areas/${id}`);
    return response.data;
  },
};
