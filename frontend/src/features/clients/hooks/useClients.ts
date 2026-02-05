import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../../api/clients.api';
import { CreateClientDto, UpdateClientDto, ClientQueryParams } from '../../../types';

/**
 * Hook for clients CRUD operations
 */
export const useClients = (params?: ClientQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all clients
  const clientsQuery = useQuery({
    queryKey: ['clients', params],
    queryFn: () => clientsApi.getAll(params),
  });

  // Mutation for creating a client
  const createClientMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Mutation for updating a client
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Mutation for deleting a client
  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  // Mutation for bulk uploading clients via CSV
  const uploadCsvMutation = useMutation({
    mutationFn: (file: File) => clientsApi.uploadCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return {
    clientsQuery,
    createClientMutation,
    updateClientMutation,
    deleteClientMutation,
    uploadCsvMutation,
  };
};

/**
 * Hook for fetching a single client
 */
export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  });
};
