import axiosInstance from './axios';
import {
  Area,
  AreaWithCargos,
  CreateAreaDto,
  UpdateAreaDto,
  AreaListResponse,
} from '../types';

export interface AreaQueryParams {
  includeInactive?: boolean;
}

export const areasApi = {
  /**
   * Listar todas las áreas
   */
  getAll: async (params?: AreaQueryParams): Promise<AreaListResponse> => {
    const response = await axiosInstance.get<AreaListResponse>('/areas', { params });
    return response.data;
  },

  /**
   * Obtener área por ID con sus cargos
   */
  getById: async (id: string): Promise<AreaWithCargos> => {
    const response = await axiosInstance.get<AreaWithCargos>(`/areas/${id}`);
    return response.data;
  },

  /**
   * Crear nueva área
   */
  create: async (data: CreateAreaDto): Promise<Area> => {
    const response = await axiosInstance.post<Area>('/areas', data);
    return response.data;
  },

  /**
   * Actualizar área
   */
  update: async (id: string, data: UpdateAreaDto): Promise<Area> => {
    const response = await axiosInstance.put<Area>(`/areas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar área (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/areas/${id}`);
    return response.data;
  },
};
