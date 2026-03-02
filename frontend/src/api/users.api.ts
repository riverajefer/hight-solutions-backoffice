import axiosInstance from './axios';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserListResponse,
  PaginationParams,
} from '../types';

export const usersApi = {
  /**
   * Listar todos los usuarios
   */
  getAll: async (params?: PaginationParams): Promise<UserListResponse> => {
    const response = await axiosInstance.get<UserListResponse>('/users', { params });
    return response.data;
  },

  /**
   * Obtener usuario por ID
   */
  getById: async (id: string): Promise<User> => {
    const response = await axiosInstance.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo usuario
   */
  create: async (data: CreateUserDto): Promise<User> => {
    const response = await axiosInstance.post<User>('/users', data);
    return response.data;
  },

  /**
   * Actualizar usuario
   */
  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await axiosInstance.put<User>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Desactivar usuario
   */
  deactivate: async (id: string): Promise<{ message: string; user: User }> => {
    const response = await axiosInstance.patch<{ message: string; user: User }>(`/users/${id}/deactivate`);
    return response.data;
  },

  /**
   * Eliminar usuario
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/users/${id}`);
  },
};
