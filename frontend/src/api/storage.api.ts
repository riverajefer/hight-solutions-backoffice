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
   * Obtener URL de descarga de un archivo (obsoleto por requerir token)
   */
  getDownloadUrl: (fileId: string): string => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    return `${apiUrl}${BASE_URL}/${fileId}/download`;
  },

  /**
   * Descargar un archivo forzando el popup de guardado
   */
  downloadFile: async (fileId: string, customFileName?: string): Promise<void> => {
    const response = await axiosInstance.get(`${BASE_URL}/${fileId}/download`, {
      responseType: 'blob', // Importante para manejar archivos binarios
    });

    // Intentar extraer el nombre del archivo del header Content-Disposition
    let fileName = customFileName || 'archivo';
    const contentDisposition = response.headers['content-disposition'];
    if (!customFileName && contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1]);
      } else {
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (utf8Match && utf8Match[1]) {
          fileName = decodeURIComponent(utf8Match[1]);
        }
      }
    }

    // Crear la URL temporal del Blob y disparar una descarga
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName); // Forzar descarga con su nombre
    document.body.appendChild(link);
    link.click();
    
    // Limpiar 
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Eliminar un archivo
   */
  deleteFile: async (fileId: string): Promise<{ message: string }> => {
    const { data} = await axiosInstance.delete(`${BASE_URL}/${fileId}`);
    return data;
  },

  /**
   * Subir un archivo de forma independiente
   */
  uploadFile: async (
    file: File,
    options?: { entityType?: string; entityId?: string }
  ): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.entityType) formData.append('entityType', options.entityType);
    if (options?.entityId) formData.append('entityId', options.entityId);
    const { data } = await axiosInstance.post(`${BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
