import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { dtfApi } from '../../../api/dtf.api';
import type {
  DtfListFilters,
  BulkCreateDtfDto,
  UpdateDtfRecordDto,
  ChangeDtfStatusDto,
} from '../../../types/dtf.types';

export const DTF_QUERY_KEY = 'dtf';

export const useDtfList = (filters?: DtfListFilters) => {
  return useQuery({
    queryKey: [DTF_QUERY_KEY, 'list', filters],
    queryFn: () => dtfApi.getAll(filters),
  });
};

export const useDtfDetail = (id: string) => {
  return useQuery({
    queryKey: [DTF_QUERY_KEY, 'detail', id],
    queryFn: () => dtfApi.getById(id),
    enabled: !!id,
  });
};

export const useDtfFiles = (id: string) => {
  return useQuery({
    queryKey: [DTF_QUERY_KEY, 'files', id],
    queryFn: () => dtfApi.getFiles(id),
    enabled: !!id,
  });
};

export const useDtfStatusHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: [DTF_QUERY_KEY, 'status-history', id],
    queryFn: () => dtfApi.getStatusHistory(id!),
    enabled: !!id,
  });
};

export const useDtfMutations = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [DTF_QUERY_KEY] });
  };

  const bulkCreate = useMutation({
    mutationFn: (dto: BulkCreateDtfDto) => dtfApi.bulkCreate(dto),
    onSuccess: (data) => {
      invalidate();
      enqueueSnackbar(`${data.length} registro(s) DTF creado(s) exitosamente`, { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al crear registros DTF', { variant: 'error' });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDtfRecordDto }) =>
      dtfApi.update(id, dto),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Registro DTF actualizado', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al actualizar registro DTF', { variant: 'error' });
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeDtfStatusDto }) =>
      dtfApi.changeStatus(id, dto),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Estado actualizado', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al cambiar estado', { variant: 'error' });
    },
  });

  const convertToOrder = useMutation({
    mutationFn: (id: string) => dtfApi.convertToOrder(id),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Registro convertido en Orden de Pedido', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al convertir en Orden de Pedido', { variant: 'error' });
    },
  });

  const uploadImage = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      dtfApi.uploadImage(id, file),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Imagen subida exitosamente', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al subir imagen', { variant: 'error' });
    },
  });

  const uploadComprobante = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      dtfApi.uploadComprobante(id, file),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Comprobante subido exitosamente', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Error al subir comprobante', { variant: 'error' });
    },
  });

  return { bulkCreate, update, changeStatus, convertToOrder, uploadImage, uploadComprobante };
};
