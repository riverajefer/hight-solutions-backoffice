import axiosInstance from './axios';
import type { ProductionBoardResponse } from '../types/production-board.types';

export const productionBoardApi = {
  /**
   * Órdenes abiertas del tablero de producción dentro de la ventana de días
   */
  get: async (params?: { days?: number }): Promise<ProductionBoardResponse> => {
    const response = await axiosInstance.get<ProductionBoardResponse>('/production-board', {
      params,
    });
    return response.data;
  },
};
