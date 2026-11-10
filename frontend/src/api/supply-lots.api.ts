import axiosInstance from './axios';
import {
  CreateSupplyLotDto,
  SupplyLotDetail,
  SupplyLotFilters,
  SupplyLotsResponse,
  SupplyLotSummary,
} from '../types';

const BASE_URL = '/supply-lots';

export const supplyLotsApi = {
  getAll: async (filters: SupplyLotFilters): Promise<SupplyLotsResponse> => {
    const { data } = await axiosInstance.get<SupplyLotsResponse>(BASE_URL, {
      params: {
        supplyId: filters.supplyId || undefined,
        view: filters.view,
        search: filters.search || undefined,
        page: filters.page,
        limit: filters.limit,
      },
    });
    return data;
  },

  getSummary: async (): Promise<SupplyLotSummary[]> => {
    const { data } = await axiosInstance.get<SupplyLotSummary[]>(`${BASE_URL}/summary`);
    return data;
  },

  getById: async (id: string): Promise<SupplyLotDetail> => {
    const { data } = await axiosInstance.get<SupplyLotDetail>(`${BASE_URL}/${id}`);
    return data;
  },

  create: async (dto: CreateSupplyLotDto): Promise<SupplyLotDetail> => {
    const { data } = await axiosInstance.post<SupplyLotDetail>(BASE_URL, dto);
    return data;
  },

  void: async (id: string, reason: string): Promise<SupplyLotDetail> => {
    const { data } = await axiosInstance.post<SupplyLotDetail>(`${BASE_URL}/${id}/void`, { reason });
    return data;
  },
};
