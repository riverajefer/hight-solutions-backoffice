import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import type {
  CreateCommercialChannelDto,
  UpdateCommercialChannelDto,
} from '../../../types/commercialChannel.types';

const QUERY_KEY = 'commercialChannels';

export const useCommercialChannels = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Query para obtener todos los canales de venta
  const commercialChannelsQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => commercialChannelsApi.getAll(),
  });

  // Mutation para crear un canal de venta
  const createMutation = useMutation({
    mutationFn: (data: CreateCommercialChannelDto) =>
      commercialChannelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      enqueueSnackbar('Canal de venta creado exitosamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear el canal de venta',
        { variant: 'error' }
      );
    },
  });

  // Mutation para actualizar un canal de venta
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCommercialChannelDto;
    }) => commercialChannelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      enqueueSnackbar('Canal de venta actualizado exitosamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message ||
          'Error al actualizar el canal de venta',
        { variant: 'error' }
      );
    },
  });

  // Mutation para eliminar un canal de venta
  const deleteMutation = useMutation({
    mutationFn: (id: string) => commercialChannelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      enqueueSnackbar('Canal de venta eliminado exitosamente', {
        variant: 'success',
      });
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al eliminar el canal de venta',
        { variant: 'error' }
      );
    },
  });

  return {
    commercialChannelsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
