import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { accountsPayableApi } from '../../../api/accounts-payable.api';
import type {
  CancelAccountPayableDto,
  CreateAccountPayableDto,
  CreateAttachmentDto,
  FilterAccountPayableDto,
  RegisterPaymentDto,
  SetInstallmentsDto,
  UpdateAccountPayableDto,
  UpdateInstallmentDto,
} from '../../../types/accounts-payable.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const accountsPayableKeys = {
  all: ['accounts-payable'] as const,
  lists: () => [...accountsPayableKeys.all, 'list'] as const,
  list: (filters?: FilterAccountPayableDto) =>
    [...accountsPayableKeys.lists(), filters] as const,
  details: () => [...accountsPayableKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountsPayableKeys.details(), id] as const,
  summary: () => [...accountsPayableKeys.all, 'summary'] as const,
  payments: (id: string) => [...accountsPayableKeys.all, id, 'payments'] as const,
  installments: (id: string) => [...accountsPayableKeys.all, id, 'installments'] as const,
};

// ─── Hook: useAccountsPayable (lista) ─────────────────────────────────────────

export const useAccountsPayable = (filters?: FilterAccountPayableDto) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const query = useQuery({
    queryKey: accountsPayableKeys.list(filters),
    queryFn: () => accountsPayableApi.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateAccountPayableDto) => accountsPayableApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      enqueueSnackbar('Cuenta por pagar creada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al crear la cuenta por pagar';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelAccountPayableDto }) =>
      accountsPayableApi.cancel(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      enqueueSnackbar('Cuenta anulada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al anular la cuenta';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return { query, createMutation, cancelMutation };
};

// ─── Hook: useAccountPayableSummary ───────────────────────────────────────────

export const useAccountPayableSummary = () => {
  return useQuery({
    queryKey: accountsPayableKeys.summary(),
    queryFn: () => accountsPayableApi.getSummary(),
    staleTime: 30_000,
  });
};

// ─── Hook: useAccountPayable (detalle) ────────────────────────────────────────

export const useAccountPayable = (id?: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const query = useQuery({
    queryKey: accountsPayableKeys.detail(id || ''),
    queryFn: () => accountsPayableApi.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateAccountPayableDto) => accountsPayableApi.update(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      enqueueSnackbar('Cuenta actualizada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al actualizar la cuenta';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (dto: CancelAccountPayableDto) => accountsPayableApi.cancel(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      enqueueSnackbar('Cuenta anulada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al anular la cuenta';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const registerPaymentMutation = useMutation({
    mutationFn: (dto: RegisterPaymentDto) => accountsPayableApi.registerPayment(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.payments(id!) });
      enqueueSnackbar('Pago registrado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al registrar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => accountsPayableApi.deletePayment(id!, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.summary() });
      enqueueSnackbar('Pago anulado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al anular el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const addAttachmentMutation = useMutation({
    mutationFn: (dto: CreateAttachmentDto) => accountsPayableApi.addAttachment(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      enqueueSnackbar('Adjunto añadido correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al adjuntar el archivo';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => accountsPayableApi.deleteAttachment(id!, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      enqueueSnackbar('Adjunto eliminado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al eliminar el adjunto';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const setInstallmentsMutation = useMutation({
    mutationFn: (dto: SetInstallmentsDto) => accountsPayableApi.setInstallments(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.installments(id!) });
      enqueueSnackbar('Plan de cuotas guardado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al guardar el plan de cuotas';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const toggleInstallmentPaidMutation = useMutation({
    mutationFn: ({ installmentId, dto }: { installmentId: string; dto: UpdateInstallmentDto }) =>
      accountsPayableApi.toggleInstallmentPaid(id!, installmentId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.installments(id!) });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al actualizar la cuota';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const deleteInstallmentMutation = useMutation({
    mutationFn: (installmentId: string) => accountsPayableApi.deleteInstallment(id!, installmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: accountsPayableKeys.installments(id!) });
      enqueueSnackbar('Cuota eliminada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al eliminar la cuota';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    query,
    updateMutation,
    cancelMutation,
    registerPaymentMutation,
    deletePaymentMutation,
    addAttachmentMutation,
    deleteAttachmentMutation,
    setInstallmentsMutation,
    toggleInstallmentPaidMutation,
    deleteInstallmentMutation,
  };
};

// ─── Hook: useAccountPayablePayments ─────────────────────────────────────────

export const useAccountPayablePayments = (id?: string) => {
  return useQuery({
    queryKey: accountsPayableKeys.payments(id || ''),
    queryFn: () => accountsPayableApi.getPayments(id!),
    enabled: !!id,
  });
};
