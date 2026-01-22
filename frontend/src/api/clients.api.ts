import axiosInstance from './axios';
import {
  Client,
  CreateClientDto,
  UpdateClientDto,
  ClientQueryParams,
  ClientListResponse,
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
   * Create a new client
   */
  create: async (data: CreateClientDto): Promise<Client> => {
    const response = await axiosInstance.post<Client>('/clients', data);
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
};
