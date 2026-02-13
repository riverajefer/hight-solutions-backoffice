import axiosInstance from './axios';

const BASE_URL = '/storage';

export const storageApi = {
  /**
   * Obtener URL firmada de un archivo
   */
  getFileUrl: async (fileId: string, expiresIn?: number): Promise<{ url: string }> => {
    const params = expiresIn ? `?expiresIn=${expiresIn}` : '';
    const { data } = await axiosInstance.get<{ url: string }>(
      `${BASE_URL}/${fileId}/url${params}`
    );
    return data;
  },

  /**
   * Obtener metadata de un archivo
   */
  getFile: async (fileId: string): Promise<any> => {
    const { data } = await axiosInstance.get(`${BASE_URL}/${fileId}`);
    return data;
  },

  /**
   * Obtener URL de descarga de un archivo
   */
  getDownloadUrl: (fileId: string): string => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    return `${apiUrl}${BASE_URL}/${fileId}/download`;
  },

  /**
   * Eliminar un archivo
   */
  deleteFile: async (fileId: string): Promise<{ message: string }> => {
    const { data} = await axiosInstance.delete(`${BASE_URL}/${fileId}`);
    return data;
  },
};
