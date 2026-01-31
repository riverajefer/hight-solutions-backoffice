import axiosInstance from './axios';
import type {
  CommercialChannel,
  CreateCommercialChannelDto,
  UpdateCommercialChannelDto,
} from '../types/commercialChannel.types';

const BASE_URL = '/commercial-channels';

export const commercialChannelsApi = {
  /**
   * Obtener todos los canales de venta
   */
  getAll: async (): Promise<CommercialChannel[]> => {
    const { data } = await axiosInstance.get<CommercialChannel[]>(BASE_URL);
    return data;
  },

  /**
   * Obtener un canal de venta por ID
   */
  getById: async (id: string): Promise<CommercialChannel> => {
    const { data } = await axiosInstance.get<CommercialChannel>(
      `${BASE_URL}/${id}`
    );
    return data;
  },

  /**
   * Crear un nuevo canal de venta
   */
  create: async (
    dto: CreateCommercialChannelDto
  ): Promise<CommercialChannel> => {
    const { data } = await axiosInstance.post<CommercialChannel>(BASE_URL, dto);
    return data;
  },

  /**
   * Actualizar un canal de venta
   */
  update: async (
    id: string,
    dto: UpdateCommercialChannelDto
  ): Promise<CommercialChannel> => {
    const { data } = await axiosInstance.put<CommercialChannel>(
      `${BASE_URL}/${id}`,
      dto
    );
    return data;
  },

  /**
   * Eliminar un canal de venta
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await axiosInstance.delete<{ message: string }>(
      `${BASE_URL}/${id}`
    );
    return data;
  },
};
