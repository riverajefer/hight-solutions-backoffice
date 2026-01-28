import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  serviceCategoriesApi,
  ServiceCategoryQueryParams,
} from '../../../../api/service-categories.api';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from '../../../../types/service-category.types';

/**
 * Custom hook for Service Categories list and mutations
 */
export const useServiceCategories = (params?: ServiceCategoryQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all service categories
  const serviceCategoriesQuery = useQuery({
    queryKey: ['service-categories', params],
    queryFn: () => serviceCategoriesApi.getAll(params),
  });

  // Mutation for creating a service category
  const createServiceCategoryMutation = useMutation({
    mutationFn: (data: CreateServiceCategoryDto) =>
      serviceCategoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });

  // Mutation for updating a service category
  const updateServiceCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceCategoryDto }) =>
      serviceCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });

  // Mutation for deleting a service category
  const deleteServiceCategoryMutation = useMutation({
    mutationFn: (id: string) => serviceCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });

  return {
    serviceCategoriesQuery,
    createServiceCategoryMutation,
    updateServiceCategoryMutation,
    deleteServiceCategoryMutation,
  };
};

/**
 * Custom hook for fetching a single service category
 */
export const useServiceCategory = (id: string) => {
  return useQuery({
    queryKey: ['service-categories', id],
    queryFn: () => serviceCategoriesApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
