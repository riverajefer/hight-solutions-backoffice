import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  servicesApi,
  ServiceQueryParams,
} from '../../../../api/services.api';
import {
  CreateServiceDto,
  UpdateServiceDto,
} from '../../../../types/service.types';

/**
 * Custom hook for Services list and mutations
 */
export const useServices = (params?: ServiceQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all services
  const servicesQuery = useQuery({
    queryKey: ['services', params],
    queryFn: () => servicesApi.getAll(params),
  });

  // Mutation for creating a service
  const createServiceMutation = useMutation({
    mutationFn: (data: CreateServiceDto) =>
      servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Mutation for updating a service
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceDto }) =>
      servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Mutation for deleting a service
  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  return {
    servicesQuery,
    createServiceMutation,
    updateServiceMutation,
    deleteServiceMutation,
  };
};

/**
 * Custom hook for fetching a single service
 */
export const useService = (id: string) => {
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
