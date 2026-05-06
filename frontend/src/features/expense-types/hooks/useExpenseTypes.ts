import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseTypesApi } from '../../../api/expense-types.api';
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
  CreateExpenseSubcategoryDto,
  UpdateExpenseSubcategoryDto,
} from '../../../types/expense-type.types';

// ─── Expense Types ─────────────────────────────────────────────────────────────

export const useExpenseTypes = () => {
  const queryClient = useQueryClient();

  const expenseTypesQuery = useQuery({
    queryKey: ['expense-types'],
    queryFn: () => expenseTypesApi.getAll(),
  });

  const createExpenseTypeMutation = useMutation({
    mutationFn: (data: CreateExpenseTypeDto) => expenseTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  const updateExpenseTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseTypeDto }) =>
      expenseTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  const deleteExpenseTypeMutation = useMutation({
    mutationFn: (id: string) => expenseTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  return {
    expenseTypesQuery,
    createExpenseTypeMutation,
    updateExpenseTypeMutation,
    deleteExpenseTypeMutation,
  };
};

export const useExpenseType = (id: string) => {
  return useQuery({
    queryKey: ['expense-types', id],
    queryFn: () => expenseTypesApi.getById(id),
    enabled: !!id,
  });
};

// ─── Expense Subcategories ─────────────────────────────────────────────────────

export const useExpenseSubcategories = (expenseTypeId?: string) => {
  const queryClient = useQueryClient();

  const expenseSubcategoriesQuery = useQuery({
    queryKey: ['expense-subcategories', expenseTypeId],
    queryFn: () => expenseTypesApi.getAllSubcategories(expenseTypeId),
  });

  const createExpenseSubcategoryMutation = useMutation({
    mutationFn: (data: CreateExpenseSubcategoryDto) =>
      expenseTypesApi.createSubcategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  const updateExpenseSubcategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseSubcategoryDto }) =>
      expenseTypesApi.updateSubcategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  const deleteExpenseSubcategoryMutation = useMutation({
    mutationFn: (id: string) => expenseTypesApi.deleteSubcategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
    },
  });

  return {
    expenseSubcategoriesQuery,
    createExpenseSubcategoryMutation,
    updateExpenseSubcategoryMutation,
    deleteExpenseSubcategoryMutation,
  };
};

export const useExpenseSubcategory = (id: string) => {
  return useQuery({
    queryKey: ['expense-subcategories', id],
    queryFn: () => expenseTypesApi.getSubcategoryById(id),
    enabled: !!id,
  });
};
