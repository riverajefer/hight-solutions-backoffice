import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../../api';
import { User, CreateUserDto, UpdateUserDto } from '../../../types';

export const useUsers = () => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
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

  return {
    usersQuery,
    getUserQuery,
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
  };
};
