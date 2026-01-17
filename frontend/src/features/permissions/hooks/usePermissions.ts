import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../../../api';
import { CreatePermissionDto, UpdatePermissionDto } from '../../../types';

export const usePermissions = () => {
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsApi.getAll(),
  });

  const getPermissionQuery = (id: string) => {
    return useQuery({
      queryKey: ['permissions', id],
      queryFn: () => permissionsApi.getById(id),
      enabled: !!id,
    });
  };

  const createPermissionMutation = useMutation({
    mutationFn: (data: CreatePermissionDto) => permissionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionDto }) =>
      permissionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id: string) => permissionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  return {
    permissionsQuery,
    getPermissionQuery,
    createPermissionMutation,
    updatePermissionMutation,
    deletePermissionMutation,
  };
};
