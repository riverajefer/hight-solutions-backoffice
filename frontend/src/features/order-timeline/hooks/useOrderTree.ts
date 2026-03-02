import { useQuery } from '@tanstack/react-query';
import { orderTimelineApi } from '../api/order-timeline.api';
import type { EntityType } from '../types/order-timeline.types';

export const useOrderTree = (entityType: EntityType, entityId: string) => {
  return useQuery({
    queryKey: ['order-tree', entityType, entityId],
    queryFn: () => orderTimelineApi.getOrderTree(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
};

export const useOrderTimelineSearch = (query: string) => {
  return useQuery({
    queryKey: ['order-timeline-search', query],
    queryFn: () => orderTimelineApi.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
};
