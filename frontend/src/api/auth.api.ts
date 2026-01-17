import axiosInstance from './axios';
import { AuthResponse, LoginDto, RegisterDto } from '../types';

export const authApi = {
  /**
   * Login con email y password
   */
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Registrar nuevo usuario
   */
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Refrescar access token usando refresh token
   */
  refresh: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axiosInstance.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Logout del usuario actual
   */
  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },

  /**
   * Obtener información del usuario actual con sus permisos
   */
  me: async (): Promise<{ user: any; permissions: string[] }> => {
    const response = await axiosInstance.post('/auth/me');
    return response.data;
  },
};
