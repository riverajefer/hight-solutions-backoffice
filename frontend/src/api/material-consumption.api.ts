import axiosInstance from './axios';
import {
  LotConsumptionReport,
  OrderMaterialConsumption,
  PendingMaterialConsumption,
} from '../types';

const BASE_URL = '/material-consumption';

export const materialConsumptionApi = {
  getByOrder: async (orderId: string): Promise<OrderMaterialConsumption[]> => {
    const { data } = await axiosInstance.get<OrderMaterialConsumption[]>(`${BASE_URL}/orders/${orderId}`);
    return data;
  },

  syncOrder: async (orderId: string): Promise<OrderMaterialConsumption[]> => {
    const { data } = await axiosInstance.post<OrderMaterialConsumption[]>(`${BASE_URL}/orders/${orderId}/sync`);
    return data;
  },

  /** `quantity: null` vuelve al cálculo automático de la regla del producto. */
  correctItem: async (
    orderItemId: string,
    supplyId: string,
    quantity: number | null,
  ): Promise<OrderMaterialConsumption[]> => {
    const { data } = await axiosInstance.put<OrderMaterialConsumption[]>(
      `${BASE_URL}/order-items/${orderItemId}`,
      { supplyId, quantity },
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
