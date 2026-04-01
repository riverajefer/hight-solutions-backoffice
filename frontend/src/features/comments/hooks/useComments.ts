import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { commentsApi } from '../../../api';
import { CommentEntityType, CreateCommentDto } from '../../../types';

export const useComments = (entityType: CommentEntityType, entityId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['comments', entityType, entityId];

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => commentsApi.getByEntity(entityType, entityId),
    enabled: Boolean(entityId),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCommentDto) => commentsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear el comentario',
        { variant: 'error' },
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al eliminar el comentario',
        { variant: 'error' },
      );
    },
  });

  return { commentsQuery, createMutation, deleteMutation };
};
