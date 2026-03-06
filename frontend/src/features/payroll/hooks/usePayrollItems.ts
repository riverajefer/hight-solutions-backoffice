import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollItemsApi } from '../../../api/payroll-items.api';
import type { CreatePayrollItemDto, UpdatePayrollItemDto } from '../../../types';

export const usePayrollItems = (periodId: string) => {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['payroll-items', periodId],
    queryFn: () => payrollItemsApi.getByPeriod(periodId),
    enabled: !!periodId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePayrollItemDto) => payrollItemsApi.create(periodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods', periodId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdatePayrollItemDto }) =>
      payrollItemsApi.update(periodId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods', periodId, 'summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => payrollItemsApi.delete(periodId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods', periodId, 'summary'] });
    },
  });

  return { itemsQuery, createMutation, updateMutation, deleteMutation };
};
