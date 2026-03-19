import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { attendanceApi } from '../../../api';
import { AttendanceFilter, ClockOutDto, AdjustAttendanceDto, ClockInDto } from '../../../types';

export const ATTENDANCE_STATUS_QUERY_KEY = ['attendance', 'my-status'];

export const useAttendance = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState<AttendanceFilter>({ page: 1, limit: 20 });

  // Estado actual de asistencia del usuario
  const statusQuery = useQuery({
    queryKey: ATTENDANCE_STATUS_QUERY_KEY,
    queryFn: () => attendanceApi.getMyStatus(),
    refetchInterval: 60000, // Refresca cada minuto para sincronizar el estado
  });

  // Todos los registros (admin)
  const recordsQuery = useQuery({
    queryKey: ['attendance', 'records', filters],
    queryFn: () => attendanceApi.getAll(filters),
  });

  // Mutation: marcar entrada
  const clockInMutation = useMutation({
    mutationFn: (dto?: ClockInDto) => attendanceApi.clockIn(dto),
    onSuccess: () => {
      enqueueSnackbar('Entrada registrada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al marcar entrada';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: marcar salida
  const clockOutMutation = useMutation({
    mutationFn: (dto: ClockOutDto) => attendanceApi.clockOut(dto),
    onSuccess: () => {
      enqueueSnackbar('Salida registrada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al marcar salida';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  // Mutation: ajustar registro (admin)
  const adjustMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AdjustAttendanceDto }) =>
      attendanceApi.adjustRecord(id, dto),
    onSuccess: () => {
      enqueueSnackbar('Registro ajustado exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Error al ajustar el registro';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const updateFilters = (newFilters: Partial<AttendanceFilter>) => {
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
    statusQuery,
    recordsQuery,
    filters,
    updateFilters,
    changePage,
    clockInMutation,
    clockOutMutation,
    adjustMutation,
  };
};
