import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { quoteKanbanColumnsApi } from '../../../api/quoteKanbanColumns.api';
import { UpdateQuoteKanbanColumnDto, ReorderQuoteKanbanColumnsDto } from '../../../types/quoteKanban.types';

export const KANBAN_COLUMNS_QUERY_KEY = ['quoteKanbanColumns'];

export const useQuoteKanbanColumns = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const columnsQuery = useQuery({
    queryKey: KANBAN_COLUMNS_QUERY_KEY,
    queryFn: quoteKanbanColumnsApi.findAll,
    staleTime: 5 * 60 * 1000,
  });

  const updateColumnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteKanbanColumnDto }) =>
      quoteKanbanColumnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
      enqueueSnackbar('Columna actualizada', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al actualizar columna',
        { variant: 'error' },
      );
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: (dto: ReorderQuoteKanbanColumnsDto) => quoteKanbanColumnsApi.reorder(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al reordenar columnas',
        { variant: 'error' },
      );
    },
  });

  return {
    columnsQuery,
    columns: columnsQuery.data ?? [],
    updateColumnMutation,
    reorderColumnsMutation,
  };
};
