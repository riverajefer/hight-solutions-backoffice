import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../../../api/suppliers.api';
import { CreateSupplierDto, UpdateSupplierDto, SupplierQueryParams } from '../../../types';

/**
 * Hook for suppliers CRUD operations
 */
export const useSuppliers = (params?: SupplierQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all suppliers
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersApi.getAll(params),
  });

  // Mutation for creating a supplier
  const createSupplierMutation = useMutation({
    mutationFn: (data: CreateSupplierDto) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  // Mutation for updating a supplier
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierDto }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  // Mutation for deleting a supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  return {
    suppliersQuery,
    createSupplierMutation,
    updateSupplierMutation,
    deleteSupplierMutation,
  };
};

/**
 * Hook for fetching a single supplier
 */
export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!id,
  });
};
