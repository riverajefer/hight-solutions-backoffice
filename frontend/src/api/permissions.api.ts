import axiosInstance from './axios';
import {
  Permission,
  CreatePermissionDto,
  UpdatePermissionDto,
  BulkCreatePermissionsDto,
  PermissionListResponse,
  PaginationParams,
} from '../types';

export const permissionsApi = {
  /**
   * Listar todos los permisos
   */
  getAll: async (params?: PaginationParams): Promise<PermissionListResponse> => {
    const response = await axiosInstance.get<PermissionListResponse>('/permissions', {
      params,
    });
    return response.data;
  },

  /**
   * Obtener permiso por ID
   */
  getById: async (id: string): Promise<Permission> => {
    const response = await axiosInstance.get<Permission>(`/permissions/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo permiso
   */
  create: async (data: CreatePermissionDto): Promise<Permission> => {
    const response = await axiosInstance.post<Permission>('/permissions', data);
    return response.data;
  },

  /**
   * Crear múltiples permisos
   */
  createBulk: async (data: BulkCreatePermissionsDto): Promise<Permission[]> => {
    const response = await axiosInstance.post<Permission[]>('/permissions/bulk', data);
    return response.data;
  },

  /**
   * Actualizar permiso
   */
  update: async (id: string, data: UpdatePermissionDto): Promise<Permission> => {
    const response = await axiosInstance.put<Permission>(`/permissions/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar permiso
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/permissions/${id}`);
  },
};
