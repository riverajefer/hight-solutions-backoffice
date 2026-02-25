import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { expenseOrdersApi } from '../../../api/expense-orders.api';
import type {
  FilterExpenseOrdersDto,
  CreateExpenseItemDto,
  CreateExpenseOrderDto,
  UpdateExpenseOrderDto,
  UpdateExpenseOrderStatusDto,
} from '../../../types/expense-order.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const expenseOrdersKeys = {
  all: ['expense-orders'] as const,
  lists: () => [...expenseOrdersKeys.all, 'list'] as const,
  list: (filters?: FilterExpenseOrdersDto) =>
    [...expenseOrdersKeys.lists(), filters] as const,
  details: () => [...expenseOrdersKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseOrdersKeys.details(), id] as const,
  types: ['expense-types'] as const,
  subcategories: (expenseTypeId?: string) =>
    ['expense-subcategories', expenseTypeId] as const,
};

// ─── Hook: useExpenseOrders ───────────────────────────────────────────────────

export const useExpenseOrders = (filters?: FilterExpenseOrdersDto) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const expenseOrdersQuery = useQuery({
    queryKey: expenseOrdersKeys.list(filters),
    queryFn: () => expenseOrdersApi.getAll(filters),
  });

  const createExpenseOrderMutation = useMutation({
    mutationFn: ({ dto, confirmed }: { dto: CreateExpenseOrderDto; confirmed?: boolean }) =>
      expenseOrdersApi.create(dto, confirmed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.lists() });
      enqueueSnackbar('Orden de gasto creada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al crear la orden de gasto';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const deleteExpenseOrderMutation = useMutation({
    mutationFn: (id: string) => expenseOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.lists() });
      enqueueSnackbar('Orden de gasto eliminada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al eliminar la orden de gasto';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    expenseOrdersQuery,
    createExpenseOrderMutation,
    deleteExpenseOrderMutation,
  };
};

// ─── Hook: useExpenseOrder ────────────────────────────────────────────────────

export const useExpenseOrder = (id?: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const expenseOrderQuery = useQuery({
    queryKey: expenseOrdersKeys.detail(id || ''),
    queryFn: () => expenseOrdersApi.getById(id!),
    enabled: !!id,
  });

  const updateExpenseOrderMutation = useMutation({
    mutationFn: ({ id: ogId, dto }: { id: string; dto: UpdateExpenseOrderDto }) =>
      expenseOrdersApi.update(ogId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.detail(variables.id) });
      enqueueSnackbar('Orden de gasto actualizada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al actualizar la orden de gasto';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id: ogId, dto }: { id: string; dto: UpdateExpenseOrderStatusDto }) =>
      expenseOrdersApi.updateStatus(ogId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.detail(variables.id) });
      enqueueSnackbar('Estado actualizado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al cambiar el estado';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const addExpenseItemMutation = useMutation({
    mutationFn: ({ id: ogId, dto }: { id: string; dto: CreateExpenseItemDto }) =>
      expenseOrdersApi.addItem(ogId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseOrdersKeys.detail(variables.id) });
      enqueueSnackbar('Ítem agregado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al agregar el ítem';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    expenseOrderQuery,
    updateExpenseOrderMutation,
    updateStatusMutation,
    addExpenseItemMutation,
  };
};

// ─── Hook: useExpenseTypes ────────────────────────────────────────────────────

export const useExpenseTypes = () => {
  return useQuery({
    queryKey: expenseOrdersKeys.types,
    queryFn: () => expenseOrdersApi.getTypes(),
  });
};

export const useExpenseSubcategories = (expenseTypeId?: string) => {
  return useQuery({
    queryKey: expenseOrdersKeys.subcategories(expenseTypeId),
    queryFn: () => expenseOrdersApi.getSubcategories(expenseTypeId),
  });
};
