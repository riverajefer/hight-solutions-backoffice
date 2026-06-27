import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { ordersApi } from '../../../api/orders.api';
import type {
  FilterOrdersDto,
  CreateOrderDto,
  UpdateOrderDto,
  OrderStatus,
  CreatePaymentDto,
  UpdatePaymentDto,
  FilterProfitabilityDto,
  SalesSummary,
  UpsertSalesGoalDto,
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
  profitability: (orderId: string) =>
    [...ordersKeys.detail(orderId), 'profitability'] as const,
  profitabilityList: (filters?: FilterProfitabilityDto) =>
    [...ordersKeys.all, 'profitability', 'list', filters] as const,
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
    placeholderData: keepPreviousData,
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
      // Si es error 403 (Forbidden), NO mostrar snackbar
      // Dejar que el componente lo maneje y muestre el dialog de autorización
      if (error?.response?.status === 403) {
        return;
      }

      // Para otros errores, mostrar snackbar normalmente
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
      // Si es error 403 (Forbidden), NO mostrar snackbar
      // Dejar que el componente lo maneje y muestre el dialog de autorización
      if (error?.response?.status === 403) {
        return;
      }

      // Para otros errores, mostrar snackbar normalmente
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

  // Mutation: Editar pago (puede quedar pendiente de aprobación del admin)
  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
      file,
    }: {
      paymentId: string;
      data: UpdatePaymentDto;
      file?: File;
    }) => ordersApi.updatePayment(orderId, paymentId, data, file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.payments(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(orderId),
      });
      queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
      if (result && 'status' in result && result.status === 'PENDING_APPROVAL') {
        enqueueSnackbar(
          result.message ||
            'La edición fue enviada para aprobación del administrador',
          { variant: 'info' },
        );
      } else {
        enqueueSnackbar('Pago actualizado correctamente', {
          variant: 'success',
        });
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al actualizar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    // Query
    paymentsQuery,

    // Mutations
    addPaymentMutation,
    updatePaymentMutation,
  };
};

// ============================================================
// HOOK: useOrderProfitability - Rentabilidad de una orden
// ============================================================

export const useOrderProfitability = (orderId: string) => {
  return useQuery({
    queryKey: ordersKeys.profitability(orderId),
    queryFn: () => ordersApi.getProfitability(orderId),
    enabled: !!orderId,
  });
};

// ============================================================
// HOOK: useProfitabilityList - Lista de rentabilidad paginada
// ============================================================

export const useProfitabilityList = (filters?: FilterProfitabilityDto) => {
  return useQuery({
    queryKey: ordersKeys.profitabilityList(filters),
    queryFn: () => ordersApi.getProfitabilityList(filters),
  });
};

// ============================================================
// HOOK: useSalesSummary - Resumen de ventas por asesor
// ============================================================

export const salesSummaryKeys = {
  all: ['sales-summary'] as const,
  summary: (filters?: FilterOrdersDto) => [...salesSummaryKeys.all, filters] as const,
};

export const useSalesSummary = (filters?: FilterOrdersDto) => {
  return useQuery<SalesSummary>({
    queryKey: salesSummaryKeys.summary(filters),
    queryFn: () => ordersApi.getSalesSummary(filters),
  });
};

// ============================================================
// HOOK: useSalesGoals — Metas de ventas mensuales
// ============================================================

export const salesGoalsKeys = {
  all: ['sales-goals'] as const,
  list: (params?: { month?: number; year?: number; advisorId?: string }) =>
    [...salesGoalsKeys.all, params] as const,
};

export const useSalesGoals = (params?: { month?: number; year?: number; advisorId?: string }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const goalsQuery = useQuery({
    queryKey: salesGoalsKeys.list(params),
    queryFn: () => ordersApi.getSalesGoals(params),
    enabled: !!(params?.month && params?.year),
  });

  const upsertMutation = useMutation({
    mutationFn: (dto: UpsertSalesGoalDto) => ordersApi.upsertSalesGoal(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesGoalsKeys.all });
      enqueueSnackbar('Meta guardada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al guardar la meta';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => ordersApi.deleteSalesGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesGoalsKeys.all });
      enqueueSnackbar('Meta eliminada', { variant: 'info' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al eliminar la meta';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return { goalsQuery, upsertMutation, deleteMutation };
};
