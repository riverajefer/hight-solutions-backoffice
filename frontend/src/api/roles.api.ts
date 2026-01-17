import axiosInstance from './axios';
import {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  RoleListResponse,
  PaginationParams,
} from '../types';

export const rolesApi = {
  /**
   * Listar todos los roles
   */
  getAll: async (params?: PaginationParams): Promise<RoleListResponse> => {
    const response = await axiosInstance.get<RoleListResponse>('/roles', { params });
    return response.data;
  },

  /**
   * Obtener rol por ID
   */
  getById: async (id: string): Promise<Role> => {
    const response = await axiosInstance.get<Role>(`/roles/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo rol
   */
  create: async (data: CreateRoleDto): Promise<Role> => {
    const response = await axiosInstance.post<Role>('/roles', data);
    return response.data;
  },

  /**
   * Actualizar rol
   */
  update: async (id: string, data: UpdateRoleDto): Promise<Role> => {
    const response = await axiosInstance.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar rol
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/roles/${id}`);
  },

  /**
   * Asignar permisos a un rol
   */
  setPermissions: async (id: string, permissionIds: string[]): Promise<Role> => {
    const response = await axiosInstance.put<Role>(`/roles/${id}/permissions`, {
      permissionIds,
    });
    return response.data;
  },

  /**
   * Agregar permisos a un rol
   */
  addPermissions: async (id: string, permissionIds: string[]): Promise<Role> => {
    const response = await axiosInstance.post<Role>(`/roles/${id}/permissions`, {
      permissionIds,
    });
    return response.data;
  },

  /**
   * Remover permisos de un rol
   */
  removePermissions: async (id: string, permissionIds: string[]): Promise<Role> => {
    const response = await axiosInstance.delete<Role>(`/roles/${id}/permissions`, {
      data: { permissionIds },
    });
    return response.data;
  },
};
