import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollPeriodsApi } from '../../../api/payroll-periods.api';
import type { CreatePayrollPeriodDto, UpdatePayrollPeriodDto } from '../../../types';

export const usePayrollPeriods = () => {
  const queryClient = useQueryClient();

  const periodsQuery = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => payrollPeriodsApi.getAll(),
  });

  const getPeriodQuery = (id: string) =>
    useQuery({
      queryKey: ['payroll-periods', id],
      queryFn: () => payrollPeriodsApi.getById(id),
      enabled: !!id,
    });

  const getSummaryQuery = (id: string) =>
    useQuery({
      queryKey: ['payroll-periods', id, 'summary'],
      queryFn: () => payrollPeriodsApi.getSummary(id),
      enabled: !!id,
    });

  const createMutation = useMutation({
    mutationFn: (data: CreatePayrollPeriodDto) => payrollPeriodsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePayrollPeriodDto }) =>
      payrollPeriodsApi.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods', vars.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollPeriodsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const generateItemsMutation = useMutation({
    mutationFn: (id: string) => payrollPeriodsApi.generateItems(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods', id] });
    },
  });

  return {
    periodsQuery,
    getPeriodQuery,
    getSummaryQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    generateItemsMutation,
  };
};
