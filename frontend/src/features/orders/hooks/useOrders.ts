import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { ordersApi } from '../../../api/orders.api';
import type {
  FilterOrdersDto,
  CreateOrderDto,
  UpdateOrderDto,
  OrderStatus,
  CreatePaymentDto,
} from '../../../types/order.types';

// ============================================================
// QUERY KEYS
// ============================================================

export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (filters?: FilterOrdersDto) =>
    [...ordersKeys.lists(), filters] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
  payments: (orderId: string) =>
    [...ordersKeys.detail(orderId), 'payments'] as const,
};

// ============================================================
// HOOK: useOrders - Lista de órdenes con filtros
// ============================================================

export const useOrders = (filters?: FilterOrdersDto) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Query: Obtener lista de órdenes
  const ordersQuery = useQuery({
    queryKey: ordersKeys.list(filters),
    queryFn: () => ordersApi.getAll(filters),
  });

  // Mutation: Crear orden
  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderDto) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Orden creada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al crear la orden';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Actualizar orden
  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderDto }) =>
      ordersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(variables.id),
      });
      enqueueSnackbar('Orden actualizada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al actualizar la orden';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(variables.id),
      });
      enqueueSnackbar('Estado actualizado correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al cambiar el estado';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Eliminar orden
  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Orden eliminada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al eliminar la orden';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    // Query
    ordersQuery,

    // Mutations
    createOrderMutation,
    updateOrderMutation,
    updateStatusMutation,
    deleteOrderMutation,
  };
};

// ============================================================
// HOOK: useOrder - Orden individual
// ============================================================

export const useOrder = (id: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Query: Obtener orden por ID
  const orderQuery = useQuery({
    queryKey: ordersKeys.detail(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });

  // Mutation: Actualizar orden
  const updateOrderMutation = useMutation({
    mutationFn: (data: UpdateOrderDto) => ordersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Orden actualizada correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al actualizar la orden';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Estado actualizado correctamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al cambiar el estado';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: Eliminar orden
  const deleteOrderMutation = useMutation({
    mutationFn: () => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Orden eliminada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al eliminar la orden';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    // Query
    orderQuery,

    // Mutations
    updateOrderMutation,
    updateStatusMutation,
    deleteOrderMutation,
  };
};

// ============================================================
// HOOK: useOrderPayments - Pagos de una orden
// ============================================================

export const useOrderPayments = (orderId: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Query: Obtener pagos de la orden
  const paymentsQuery = useQuery({
    queryKey: ordersKeys.payments(orderId),
    queryFn: () => ordersApi.getPayments(orderId),
    enabled: !!orderId,
  });

  // Mutation: Agregar pago
  const addPaymentMutation = useMutation({
    mutationFn: (data: CreatePaymentDto) => ordersApi.addPayment(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(orderId),
      });
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      enqueueSnackbar('Pago registrado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al registrar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    // Query
    paymentsQuery,

    // Mutations
    addPaymentMutation,
  };
};
