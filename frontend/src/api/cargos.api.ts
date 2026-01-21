import axiosInstance from './axios';
import {
  Cargo,
  CreateCargoDto,
  UpdateCargoDto,
  CargoListResponse,
} from '../types';

export interface CargoQueryParams {
  includeInactive?: boolean;
}

export const cargosApi = {
  /**
   * Listar todos los cargos
   */
  getAll: async (params?: CargoQueryParams): Promise<CargoListResponse> => {
    const response = await axiosInstance.get<CargoListResponse>('/cargos', { params });
    return response.data;
  },

  /**
   * Listar cargos por área
   */
  getByArea: async (areaId: string, params?: CargoQueryParams): Promise<CargoListResponse> => {
    const response = await axiosInstance.get<CargoListResponse>(`/cargos/area/${areaId}`, { params });
    return response.data;
  },

  /**
   * Obtener cargo por ID
   */
  getById: async (id: string): Promise<Cargo> => {
    const response = await axiosInstance.get<Cargo>(`/cargos/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo cargo
   */
  create: async (data: CreateCargoDto): Promise<Cargo> => {
    const response = await axiosInstance.post<Cargo>('/cargos', data);
    return response.data;
  },

  /**
   * Actualizar cargo
   */
  update: async (id: string, data: UpdateCargoDto): Promise<Cargo> => {
    const response = await axiosInstance.put<Cargo>(`/cargos/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar cargo (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/cargos/${id}`);
    return response.data;
  },
};
