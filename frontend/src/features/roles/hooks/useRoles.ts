import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../../../api';
import { CreateRoleDto, UpdateRoleDto } from '../../../types';

export const useRoles = () => {
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const getRoleQuery = (id: string) => {
    return useQuery({
      queryKey: ['roles', id],
      queryFn: () => rolesApi.getById(id),
      enabled: !!id,
    });
  };

  const createRoleMutation = useMutation({
    mutationFn: (data: CreateRoleDto) => rolesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleDto }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const setPermissionsMutation = useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      rolesApi.setPermissions(id, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  return {
    rolesQuery,
    getRoleQuery,
    createRoleMutation,
    updateRoleMutation,
    setPermissionsMutation,
    deleteRoleMutation,
  };
};
