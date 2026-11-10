import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { supplyLotsApi } from '../../../api';
import { CreateSupplyLotDto, SupplyLotFilters } from '../../../types';
import { INVENTORY_LOW_STOCK_QUERY_KEY, INVENTORY_MOVEMENTS_QUERY_KEY, INVENTORY_VALUATION_QUERY_KEY } from './useInventory';

export const SUPPLY_LOTS_QUERY_KEY = ['supply-lots'];

const errorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  return message || fallback;
};

/** Invalida todo lo que muestra stock: los lotes cambian `currentStock` y el kardex. */
const useInvalidateStock = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: SUPPLY_LOTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVENTORY_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVENTORY_LOW_STOCK_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVENTORY_VALUATION_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
  };
};

export const useSupplyLots = () => {
  const [filters, setFilters] = useState<SupplyLotFilters>({ view: 'active', page: 1, limit: 20 });

  const lotsQuery = useQuery({
    queryKey: [...SUPPLY_LOTS_QUERY_KEY, 'list', filters],
    queryFn: () => supplyLotsApi.getAll(filters),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: [...SUPPLY_LOTS_QUERY_KEY, 'summary'],
    queryFn: () => supplyLotsApi.getSummary(),
  });

  const updateFilters = (next: Partial<SupplyLotFilters>) =>
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));

  return { lotsQuery, summaryQuery, filters, updateFilters };
};

export const useSupplyLot = (id: string | undefined) =>
  useQuery({
    queryKey: [...SUPPLY_LOTS_QUERY_KEY, 'detail', id],
    queryFn: () => supplyLotsApi.getById(id as string),
    enabled: !!id,
  });

export const useCreateSupplyLot = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (dto: CreateSupplyLotDto) => supplyLotsApi.create(dto),
    onSuccess: (lot) => {
      enqueueSnackbar(`Rollo ${lot.code} registrado`, { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo registrar el rollo'), { variant: 'error' }),
  });
};

export const useVoidSupplyLot = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => supplyLotsApi.void(id, reason),
    onSuccess: (lot) => {
      enqueueSnackbar(`Rollo ${lot.code} anulado`, { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo anular el rollo'), { variant: 'error' }),
  });
};
