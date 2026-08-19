import axiosInstance from './axios';
import {
  Client,
  ClientStats,
  CreateClientDto,
  UpdateClientDto,
  UpdateClientSpecialConditionDto,
  ClientQueryParams,
  ClientListResponse,
  UploadClientsResponse,
  ClientDuplicateMatch,
} from '../types';

export const clientsApi = {
  /**
   * Get all clients
   */
  getAll: async (params?: ClientQueryParams): Promise<ClientListResponse> => {
    const response = await axiosInstance.get<ClientListResponse>('/clients', {
      params,
    });
    return response.data;
  },

  /**
   * Get client by ID
   */
  getById: async (id: string): Promise<Client> => {
    const response = await axiosInstance.get<Client>(`/clients/${id}`);
    return response.data;
  },

  /**
   * Create a new client.
   *
   * Sin `force` el backend responde 409 con los posibles duplicados; el
   * formulario los muestra y deja elegir entre pedir co-propiedad del cliente
   * existente o crear igual.
   */
  create: async (data: CreateClientDto, force = false): Promise<Client> => {
    const response = await axiosInstance.post<Client>('/clients', data, {
      params: force ? { force: true } : undefined,
    });
    return response.data;
  },

  /**
   * Consulta si ya existe un cliente con estos datos, sin crear nada.
   * Sirve para avisar mientras se llena el formulario.
   */
  checkDuplicate: async (params: {
    name?: string;
    nit?: string;
    cedula?: string;
  }): Promise<ClientDuplicateMatch[]> => {
    const response = await axiosInstance.get<ClientDuplicateMatch[]>(
      '/clients/check-duplicate',
      { params },
    );
    return response.data;
  },

  /**
   * Update a client
   */
  update: async (id: string, data: UpdateClientDto): Promise<Client> => {
    const response = await axiosInstance.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  /**
   * Delete a client (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/clients/${id}`
    );
    return response.data;
  },

  /**
   * Update only the special condition field of a client.
   * Requires 'update_client_special_condition' permission.
   */
  updateSpecialCondition: async (
    id: string,
    data: UpdateClientSpecialConditionDto,
  ): Promise<Pick<Client, 'id' | 'name' | 'specialCondition' | 'updatedAt'>> => {
    const response = await axiosInstance.patch(
      `/clients/${id}/special-condition`,
      data,
    );
    return response.data;
  },

  /**
   * Get consolidated financial stats + order history for a client
   */
  getStats: async (id: string): Promise<ClientStats> => {
    const response = await axiosInstance.get<ClientStats>(`/clients/${id}/stats`);
    return response.data;
  },

  /**
   * Upload clients via CSV file (bulk import)
   */
  uploadCsv: async (file: File): Promise<UploadClientsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<UploadClientsResponse>(
      '/clients/upload',
      formData,
      {
        headers: { 'Content-Type': undefined as unknown as string },
      },
    );
    return response.data;
  },
};
