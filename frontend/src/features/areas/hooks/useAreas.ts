import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { areasApi, AreaQueryParams } from '../../../api/areas.api';
import { CreateAreaDto, UpdateAreaDto } from '../../../types';

export const useAreas = (params?: AreaQueryParams) => {
  const queryClient = useQueryClient();

  const areasQuery = useQuery({
    queryKey: ['areas', params],
    queryFn: () => areasApi.getAll(params),
  });

  const createAreaMutation = useMutation({
    mutationFn: (data: CreateAreaDto) => areasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAreaDto }) =>
      areasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => areasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  return {
    areasQuery,
    createAreaMutation,
    updateAreaMutation,
    deleteAreaMutation,
  };
};

export const useArea = (id: string) => {
  return useQuery({
    queryKey: ['areas', id],
    queryFn: () => areasApi.getById(id),
    enabled: !!id,
  });
};
