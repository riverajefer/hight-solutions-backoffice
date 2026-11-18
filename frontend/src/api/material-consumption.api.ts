import axiosInstance from './axios';
import {
  LotConsumptionReport,
  OrderMaterials,
  PendingMaterialConsumption,
  ProductSupplyRule,
} from '../types';

const BASE_URL = '/material-consumption';

export const materialConsumptionApi = {
  getByOrder: async (orderId: string): Promise<OrderMaterials> => {
    const { data } = await axiosInstance.get<OrderMaterials>(`${BASE_URL}/orders/${orderId}`);
    return data;
  },

  syncOrder: async (orderId: string): Promise<OrderMaterials> => {
    const { data } = await axiosInstance.post<OrderMaterials>(`${BASE_URL}/orders/${orderId}/sync`);
    return data;
  },

  /**
   * Fija cuánto material usó el ítem. `0` (con motivo) = lo puso el cliente;
   * `null` vuelve al cálculo automático de la receta del producto.
   */
  correctItem: async (
    orderItemId: string,
    supplyId: string,
    quantity: number | null,
    note?: string,
  ): Promise<OrderMaterials> => {
    const { data } = await axiosInstance.put<OrderMaterials>(
      `${BASE_URL}/order-items/${orderItemId}`,
      { supplyId, quantity, ...(note ? { note } : {}) },
    );
    return data;
  },

  /** El ítem se hizo en otro insumo: el de la receta queda en 0 y la cantidad pasa al nuevo. */
  swapSupply: async (
    orderItemId: string,
    dto: { fromSupplyId: string; toSupplyId: string; quantity?: number; note?: string },
  ): Promise<OrderMaterials> => {
    const { data } = await axiosInstance.put<OrderMaterials>(
      `${BASE_URL}/order-items/${orderItemId}/swap`,
      dto,
    );
    return data;
  },

  getPending: async (): Promise<PendingMaterialConsumption[]> => {
    const { data } = await axiosInstance.get<PendingMaterialConsumption[]>(`${BASE_URL}/pending`);
    return data;
  },

  assignPending: async (supplyId: string): Promise<{ assigned: number; remaining: number }> => {
    const { data } = await axiosInstance.post<{ assigned: number; remaining: number }>(
      `${BASE_URL}/pending/assign`,
      { supplyId },
    );
    return data;
  },

  getByLot: async (lotId: string): Promise<LotConsumptionReport> => {
    const { data } = await axiosInstance.get<LotConsumptionReport>(`${BASE_URL}/lots/${lotId}`);
    return data;
  },
};

export const productSupplyRulesApi = {
  getByProduct: async (productId: string): Promise<ProductSupplyRule[]> => {
    const { data } = await axiosInstance.get<ProductSupplyRule[]>(`/products/${productId}/supply-rules`);
    return data;
  },

  /** Reemplaza la receta completa: lo que no venga se desactiva. */
  replace: async (
    productId: string,
    rules: { supplyId: string; factor: number }[],
  ): Promise<ProductSupplyRule[]> => {
    const { data } = await axiosInstance.put<ProductSupplyRule[]>(
      `/products/${productId}/supply-rules`,
      { rules },
    );
    return data;
  },
};
