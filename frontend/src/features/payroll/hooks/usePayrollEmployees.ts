import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollEmployeesApi } from '../../../api/payroll-employees.api';
import type { CreatePayrollEmployeeDto, UpdatePayrollEmployeeDto } from '../../../types';

export const usePayrollEmployees = () => {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: () => payrollEmployeesApi.getAll(),
  });

  const getEmployeeQuery = (id: string) =>
    useQuery({
      queryKey: ['payroll-employees', id],
      queryFn: () => payrollEmployeesApi.getById(id),
      enabled: !!id,
    });

  const getHistoryQuery = (id: string) =>
    useQuery({
      queryKey: ['payroll-employees', id, 'history'],
      queryFn: () => payrollEmployeesApi.getHistory(id),
      enabled: !!id,
    });

  const createMutation = useMutation({
    mutationFn: (data: CreatePayrollEmployeeDto) => payrollEmployeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePayrollEmployeeDto }) =>
      payrollEmployeesApi.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-employees'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-employees', vars.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollEmployeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-employees'] });
    },
  });

  return {
    employeesQuery,
    getEmployeeQuery,
    getHistoryQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
