import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { materialConsumptionApi, supplyLotsApi } from '../../../api';
import { CreateSupplyLotDto, SupplyLotFilters } from '../../../types';
import { INVENTORY_LOW_STOCK_QUERY_KEY, INVENTORY_MOVEMENTS_QUERY_KEY, INVENTORY_VALUATION_QUERY_KEY } from './useInventory';

export const SUPPLY_LOTS_QUERY_KEY = ['supply-lots'];
export const MATERIAL_CONSUMPTION_QUERY_KEY = ['material-consumption'];

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
    queryClient.invalidateQueries({ queryKey: MATERIAL_CONSUMPTION_QUERY_KEY });
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

export const useSetLotInUse = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (id: string) => supplyLotsApi.setInUse(id),
    onSuccess: (lot) => {
      enqueueSnackbar(`Rollo ${lot.code} montado: de él sale el consumo de las OP`, { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo montar el rollo'), { variant: 'error' }),
  });
};

export const useCloseSupplyLot = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => supplyLotsApi.close(id, reason),
    onSuccess: (lot) => {
      enqueueSnackbar(`Rollo ${lot.code} cerrado`, { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo cerrar el rollo'), { variant: 'error' }),
  });
};

export const useLotConsumption = (lotId: string | undefined) =>
  useQuery({
    queryKey: [...MATERIAL_CONSUMPTION_QUERY_KEY, 'lot', lotId],
    queryFn: () => materialConsumptionApi.getByLot(lotId as string),
    enabled: !!lotId,
  });

export const usePendingConsumption = (enabled = true) =>
  useQuery({
    queryKey: [...MATERIAL_CONSUMPTION_QUERY_KEY, 'pending'],
    queryFn: () => materialConsumptionApi.getPending(),
    enabled,
  });

export const useAssignPending = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (supplyId: string) => materialConsumptionApi.assignPending(supplyId),
    onSuccess: ({ assigned, remaining }) => {
      enqueueSnackbar(
        remaining > 0
          ? `${assigned} consumo(s) asignado(s); ${remaining} siguen sin rollo por falta de saldo`
          : `${assigned} consumo(s) asignado(s) a rollos`,
        { variant: remaining > 0 ? 'warning' : 'success' },
      );
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudieron asignar los consumos'), { variant: 'error' }),
  });
};

export const useOrderMaterials = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: [...MATERIAL_CONSUMPTION_QUERY_KEY, 'order', orderId],
    queryFn: () => materialConsumptionApi.getByOrder(orderId as string),
    enabled: !!orderId && enabled,
  });

export const useCorrectConsumption = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (args: { orderItemId: string; supplyId: string; quantity: number | null }) =>
      materialConsumptionApi.correctItem(args.orderItemId, args.supplyId, args.quantity),
    onSuccess: () => {
      enqueueSnackbar('Consumo de material actualizado', { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo corregir el consumo'), { variant: 'error' }),
  });
};

export const useSyncOrderMaterials = () => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (orderId: string) => materialConsumptionApi.syncOrder(orderId),
    onSuccess: () => {
      enqueueSnackbar('Consumo de material recalculado', { variant: 'success' });
      invalidate();
    },
    onError: (error) =>
      enqueueSnackbar(errorMessage(error, 'No se pudo recalcular el consumo'), { variant: 'error' }),
  });
};
