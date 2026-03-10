import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { inventoryApi } from '../../../api';
import { CreateInventoryMovementDto, InventoryMovementFilters } from '../../../types';

export const INVENTORY_MOVEMENTS_QUERY_KEY = ['inventory', 'movements'];
export const INVENTORY_LOW_STOCK_QUERY_KEY = ['inventory', 'low-stock'];
export const INVENTORY_VALUATION_QUERY_KEY = ['inventory', 'valuation'];

export const useInventory = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState<InventoryMovementFilters>({ page: 1, limit: 20 });

  // Lista de movimientos con filtros
  const movementsQuery = useQuery({
    queryKey: [...INVENTORY_MOVEMENTS_QUERY_KEY, filters],
    queryFn: () => inventoryApi.getAll(filters),
  });

  // Insumos con stock bajo
  const lowStockQuery = useQuery({
    queryKey: INVENTORY_LOW_STOCK_QUERY_KEY,
    queryFn: () => inventoryApi.getLowStock(),
  });

  // Valoración del inventario
  const valuationQuery = useQuery({
    queryKey: INVENTORY_VALUATION_QUERY_KEY,
    queryFn: () => inventoryApi.getValuation(),
  });

  // Crear movimiento manual
  const createMutation = useMutation({
    mutationFn: (dto: CreateInventoryMovementDto) => inventoryApi.create(dto),
    onSuccess: () => {
      enqueueSnackbar('Movimiento registrado exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: INVENTORY_MOVEMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: INVENTORY_LOW_STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: INVENTORY_VALUATION_QUERY_KEY });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al registrar el movimiento';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const updateFilters = (newFilters: Partial<InventoryMovementFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  const changePage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return {
    movementsQuery,
    lowStockQuery,
    valuationQuery,
    filters,
    updateFilters,
    changePage,
    createMutation,
  };
};
