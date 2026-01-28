import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  suppliesApi,
  SupplyQueryParams,
} from '../../../../api/supplies.api';
import {
  CreateSupplyDto,
  UpdateSupplyDto,
} from '../../../../types/supply.types';

/**
 * Custom hook for Supplies list and mutations
 */
export const useSupplies = (params?: SupplyQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all supplies
  const suppliesQuery = useQuery({
    queryKey: ['supplies', params],
    queryFn: () => suppliesApi.getAll(params),
  });

  // Mutation for creating a supply
  const createSupplyMutation = useMutation({
    mutationFn: (data: CreateSupplyDto) =>
      suppliesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
    },
  });

  // Mutation for updating a supply
  const updateSupplyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyDto }) =>
      suppliesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
    },
  });

  // Mutation for deleting a supply
  const deleteSupplyMutation = useMutation({
    mutationFn: (id: string) => suppliesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
    },
  });

  return {
    suppliesQuery,
    createSupplyMutation,
    updateSupplyMutation,
    deleteSupplyMutation,
  };
};

/**
 * Custom hook for fetching a single supply
 */
export const useSupply = (id: string) => {
  return useQuery({
    queryKey: ['supplies', id],
    queryFn: () => suppliesApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
