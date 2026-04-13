import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { getFriendlyErrorMessage } from '../utils/error-messages';
import { useMaintenanceModeStore } from '../hooks/useMaintenanceMode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Crea una instancia de Axios configurada con interceptores
 * para manejo de autenticación y refresh token
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud: agrega el token de acceso
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const token = authStore.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta: maneja 503 (mantenimiento), 401, refresh token y errores
axiosInstance.interceptors.response.use(
  (response) => {
    // Si estábamos en modo mantenimiento y el servidor respondió OK, desactivarlo
    const { isMaintenanceMode, deactivateMaintenance } =
      useMaintenanceModeStore.getState();
    if (isMaintenanceMode) {
      deactivateMaintenance();
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Manejo de Modo Mantenimiento — 503 Service Unavailable
    if (error.response?.status === 503) {
      const data = error.response.data as Record<string, unknown>;
      const message =
        (data?.message as string) ||
        'El sistema se encuentra en mantenimiento. Por favor intenta más tarde.';
      useMaintenanceModeStore.getState().activateMaintenance(message);
      return Promise.reject(error);
    }

    // Manejo de Refresh Token - No reintentar para endpoints de auth
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') || 
                          originalRequest.url?.includes('/auth/refresh') ||
                          originalRequest.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const authStore = useAuthStore.getState();
        await authStore.refreshAccessToken();

        // Reintentar la solicitud original
        const newToken = useAuthStore.getState().accessToken;
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, desloguear
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Estandarización de mensajes de error
    const data = error.response?.data as any;
    const backendMessage = data?.message || error.message;
    
    if (error.response) {
      // Si hay respuesta del servidor, intentar obtener un mensaje amigable
      error.message = getFriendlyErrorMessage(backendMessage);
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'No se pudo conectar con el servidor';
    } else if (error.message === 'Network Error') {
      error.message = 'Error de red';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
