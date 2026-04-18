import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../../api';
import { CreateUserDto, UpdateUserDto } from '../../../types';

export const useUsers = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: options?.enabled ?? true,
  });

  const getUserQuery = (id: string) => {
    return useQuery({
      queryKey: ['users', id],
      queryFn: () => usersApi.getById(id),
      enabled: !!id,
    });
  };

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });

  return {
    usersQuery,
    getUserQuery,
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
    deactivateUserMutation,
  };
};
