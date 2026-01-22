import axiosInstance from './axios';
import { AuthResponse, LoginDto, RegisterDto, ProfileResponse, UpdateProfilePhotoDto } from '../types';

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
  refresh: async (userId: string, refreshToken: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/refresh', {
      userId,
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

  /**
   * Obtener perfil completo del usuario actual
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get<ProfileResponse>('/auth/profile');
    return response.data;
  },

  /**
   * Actualizar foto de perfil
   */
  updateProfilePhoto: async (data: UpdateProfilePhotoDto): Promise<{ id: string; profilePhoto: string | null }> => {
    const response = await axiosInstance.patch('/auth/profile/photo', data);
    return response.data;
  },
};
