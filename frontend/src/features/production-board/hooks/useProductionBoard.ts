import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productionBoardApi } from '../../../api/production-board.api';
import type { ProductionBoardResponse } from '../../../types/production-board.types';
import { BOARD_DAYS, BOARD_REFETCH_MS } from '../boardConfig';

export const productionBoardKeys = {
  all: ['production-board'] as const,
  board: (days: number) => [...productionBoardKeys.all, days] as const,
};

export const useProductionBoard = (days: number = BOARD_DAYS) => {
  return useQuery<ProductionBoardResponse>({
    queryKey: productionBoardKeys.board(days),
    queryFn: () => productionBoardApi.get({ days }),
    staleTime: 30_000,
    refetchInterval: BOARD_REFETCH_MS,
    placeholderData: keepPreviousData,
  });
};
