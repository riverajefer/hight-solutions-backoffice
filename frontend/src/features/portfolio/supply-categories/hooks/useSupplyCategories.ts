import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supplyCategoriesApi,
  SupplyCategoryQueryParams,
} from '../../../../api/supply-categories.api';
import {
  CreateSupplyCategoryDto,
  UpdateSupplyCategoryDto,
} from '../../../../types/supply-category.types';

/**
 * Custom hook for Supply Categories list and mutations
 */
export const useSupplyCategories = (params?: SupplyCategoryQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all supply categories
  const supplyCategoriesQuery = useQuery({
    queryKey: ['supply-categories', params],
    queryFn: () => supplyCategoriesApi.getAll(params),
  });

  // Mutation for creating a supply category
  const createSupplyCategoryMutation = useMutation({
    mutationFn: (data: CreateSupplyCategoryDto) =>
      supplyCategoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories'] });
    },
  });

  // Mutation for updating a supply category
  const updateSupplyCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyCategoryDto }) =>
      supplyCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories'] });
    },
  });

  // Mutation for deleting a supply category
  const deleteSupplyCategoryMutation = useMutation({
    mutationFn: (id: string) => supplyCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories'] });
    },
  });

  return {
    supplyCategoriesQuery,
    createSupplyCategoryMutation,
    updateSupplyCategoryMutation,
    deleteSupplyCategoryMutation,
  };
};

/**
 * Custom hook for fetching a single supply category
 */
export const useSupplyCategory = (id: string) => {
  return useQuery({
    queryKey: ['supply-categories', id],
    queryFn: () => supplyCategoriesApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
