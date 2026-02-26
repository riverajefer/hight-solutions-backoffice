import axiosInstance from '../../../api/axios';
import type {
  OrderTreeResponse,
  EntityType,
  SearchResults,
} from '../types/order-timeline.types';

export const orderTimelineApi = {
  getOrderTree: async (
    entityType: EntityType,
    entityId: string,
  ): Promise<OrderTreeResponse> => {
    const { data } = await axiosInstance.get<OrderTreeResponse>(
      `/order-timeline/${entityType}/${entityId}`,
    );
    return data;
  },

  search: async (
    query: string,
    limit = 20,
  ): Promise<SearchResults> => {
    const { data } = await axiosInstance.get<SearchResults>(
      '/order-timeline/search',
      { params: { q: query, limit } },
    );
    return data;
  },
};
