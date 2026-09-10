import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { payrollDeductionsApi } from '../../../api/payroll-deductions.api';
import type {
  ApplyPayrollDeductionDto,
  PayrollDeductionFilters,
} from '../../../types/payroll-deduction.types';

/**
 * Cada mutación invalida también `orders` y `payroll-periods`: aplicar o
 * cancelar un descuento cambia el saldo de la OP y el pago del empleado, así que
 * dejar esas cachés como estaban mostraría cifras viejas en las dos pantallas.
 */
export const usePayrollDeductions = (filters: PayrollDeductionFilters = {}) => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payroll-deductions'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-items'] });
  };

  const deductionsQuery = useQuery({
    queryKey: ['payroll-deductions', filters],
    queryFn: () => payrollDeductionsApi.getAll(filters),
    // Sin esto la tabla parpadea a vacío en cada cambio de página.
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => payrollDeductionsApi.approve(id),
    onSuccess: invalidateAll,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      payrollDeductionsApi.reject(id, rejectionReason),
    onSuccess: invalidateAll,
  });

  const applyMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApplyPayrollDeductionDto }) =>
      payrollDeductionsApi.apply(id, dto),
    onSuccess: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) =>
      payrollDeductionsApi.cancel(id, cancelReason),
    onSuccess: invalidateAll,
  });

  return {
    deductionsQuery,
    approveMutation,
    rejectMutation,
    applyMutation,
    cancelMutation,
  };
};
