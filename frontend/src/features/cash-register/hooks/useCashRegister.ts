import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { cashRegisterApi } from '../../../api/cash-register.api';
import type {
  CreateCashRegisterDto,
  UpdateCashRegisterDto,
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  VoidCashMovementDto,
  FilterCashSessionsDto,
  FilterCashMovementsDto,
} from '../../../types/cash-register.types';

// ── Query Keys ───────────────────────────────────────────────────────────────

export const cashKeys = {
  registers: {
    all: ['cash-registers'] as const,
    lists: () => [...cashKeys.registers.all, 'list'] as const,
    detail: (id: string) => [...cashKeys.registers.all, 'detail', id] as const,
  },
  sessions: {
    all: ['cash-sessions'] as const,
    lists: () => [...cashKeys.sessions.all, 'list'] as const,
    list: (filters?: FilterCashSessionsDto) =>
      [...cashKeys.sessions.lists(), filters] as const,
    detail: (id: string) => [...cashKeys.sessions.all, 'detail', id] as const,
    balancePreview: (id: string) =>
      [...cashKeys.sessions.all, 'balance-preview', id] as const,
  },
  movements: {
    all: ['cash-movements'] as const,
    lists: () => [...cashKeys.movements.all, 'list'] as const,
    list: (filters?: FilterCashMovementsDto) =>
      [...cashKeys.movements.lists(), filters] as const,
    detail: (id: string) => [...cashKeys.movements.all, 'detail', id] as const,
  },
};

// ── Registers ────────────────────────────────────────────────────────────────

export const useCashRegisters = () => {
  return useQuery({
    queryKey: cashKeys.registers.lists(),
    queryFn: () => cashRegisterApi.getAllRegisters(),
  });
};

export const useCashRegister = (id: string) => {
  return useQuery({
    queryKey: cashKeys.registers.detail(id),
    queryFn: () => cashRegisterApi.getRegisterById(id),
    enabled: !!id,
  });
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export const useCashSessions = (filters?: FilterCashSessionsDto) => {
  return useQuery({
    queryKey: cashKeys.sessions.list(filters),
    queryFn: () => cashRegisterApi.getSessions(filters),
  });
};

export const useCashSession = (id: string) => {
  return useQuery({
    queryKey: cashKeys.sessions.detail(id),
    queryFn: () => cashRegisterApi.getSessionById(id),
    enabled: !!id,
  });
};

export const useBalancePreview = (id: string, enabled = true) => {
  return useQuery({
    queryKey: cashKeys.sessions.balancePreview(id),
    queryFn: () => cashRegisterApi.getBalancePreview(id),
    enabled: !!id && enabled,
  });
};

// ── Movements ────────────────────────────────────────────────────────────────

export const useCashMovements = (filters?: FilterCashMovementsDto) => {
  return useQuery({
    queryKey: cashKeys.movements.list(filters),
    queryFn: () => cashRegisterApi.getMovements(filters),
    enabled: !!filters?.cashSessionId,
  });
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCashMutations = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const invalidateRegisters = () =>
    queryClient.invalidateQueries({ queryKey: cashKeys.registers.all });

  const invalidateSessions = () =>
    queryClient.invalidateQueries({ queryKey: cashKeys.sessions.all });

  const invalidateMovements = () =>
    queryClient.invalidateQueries({ queryKey: cashKeys.movements.all });

  // Register mutations
  const createRegister = useMutation({
    mutationFn: (dto: CreateCashRegisterDto) => cashRegisterApi.createRegister(dto),
    onSuccess: () => {
      invalidateRegisters();
      enqueueSnackbar('Caja registradora creada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al crear la caja registradora',
        { variant: 'error' },
      );
    },
  });

  const updateRegister = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCashRegisterDto }) =>
      cashRegisterApi.updateRegister(id, dto),
    onSuccess: () => {
      invalidateRegisters();
      enqueueSnackbar('Caja registradora actualizada', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al actualizar',
        { variant: 'error' },
      );
    },
  });

  const deleteRegister = useMutation({
    mutationFn: (id: string) => cashRegisterApi.deleteRegister(id),
    onSuccess: () => {
      invalidateRegisters();
      enqueueSnackbar('Caja registradora eliminada', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al eliminar',
        { variant: 'error' },
      );
    },
  });

  // Session mutations
  const openSession = useMutation({
    mutationFn: (dto: OpenCashSessionDto) => cashRegisterApi.openSession(dto),
    onSuccess: () => {
      invalidateSessions();
      invalidateRegisters();
      enqueueSnackbar('Sesión de caja abierta correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al abrir la sesión',
        { variant: 'error' },
      );
    },
  });

  const closeSession = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CloseCashSessionDto }) =>
      cashRegisterApi.closeSession(id, dto),
    onSuccess: () => {
      invalidateSessions();
      invalidateRegisters();
      enqueueSnackbar('Sesión de caja cerrada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al cerrar la sesión',
        { variant: 'error' },
      );
    },
  });

  // Movement mutations
  const createMovement = useMutation({
    mutationFn: (dto: CreateCashMovementDto) => cashRegisterApi.createMovement(dto),
    onSuccess: (_, variables) => {
      invalidateMovements();
      queryClient.invalidateQueries({
        queryKey: cashKeys.sessions.detail(variables.cashSessionId),
      });
      enqueueSnackbar('Movimiento registrado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al registrar el movimiento',
        { variant: 'error' },
      );
    },
  });

  const voidMovement = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: VoidCashMovementDto }) =>
      cashRegisterApi.voidMovement(id, dto),
    onSuccess: () => {
      invalidateMovements();
      invalidateSessions();
      enqueueSnackbar('Movimiento anulado correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al anular el movimiento',
        { variant: 'error' },
      );
    },
  });

  return {
    createRegister,
    updateRegister,
    deleteRegister,
    openSession,
    closeSession,
    createMovement,
    voidMovement,
  };
};
