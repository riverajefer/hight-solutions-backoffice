import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { prospectsApi } from '../../../api/prospects.api';
import {
  ConvertProspectDto,
  CreateProspectContactDto,
  CreateProspectDto,
  FilterProspectsDto,
  ProspectMetricsFilterDto,
  UpdateProspectDto,
} from '../../../types/prospect.types';

export const PROSPECTS_QUERY_KEY = 'prospects';
export const PROSPECT_METRICS_QUERY_KEY = 'prospect-metrics';

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

export const useProspects = (filters?: FilterProspectsDto) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PROSPECTS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [PROSPECT_METRICS_QUERY_KEY] });
  };

  const prospectsQuery = useQuery({
    queryKey: [PROSPECTS_QUERY_KEY, filters],
    queryFn: () => prospectsApi.findAll(filters),
    // Conserva la página anterior mientras carga la siguiente: si `data` queda
    // en undefined, el `rowCount` cae a 0 y la grilla se devuelve a la página 1.
    placeholderData: keepPreviousData,
  });

  const createProspectMutation = useMutation({
    mutationFn: (data: CreateProspectDto) => prospectsApi.create(data),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Prospecto creado', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al crear el prospecto'), {
        variant: 'error',
      });
    },
  });

  const updateProspectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProspectDto }) =>
      prospectsApi.update(id, data),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['prospect'] });
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al actualizar el prospecto'), {
        variant: 'error',
      });
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: (id: string) => prospectsApi.delete(id),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Prospecto eliminado', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al eliminar el prospecto'), {
        variant: 'error',
      });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateProspectContactDto }) =>
      prospectsApi.addContact(id, data),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['prospect'] });
      enqueueSnackbar('Contacto registrado', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al registrar el contacto'), {
        variant: 'error',
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      prospectsApi.deleteContact(id, contactId),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['prospect'] });
      enqueueSnackbar('Contacto eliminado', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al eliminar el contacto'), {
        variant: 'error',
      });
    },
  });

  const convertProspectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertProspectDto }) =>
      prospectsApi.convert(id, data),
    onSuccess: () => {
      invalidate();
    },
    onError: (error: any) => {
      enqueueSnackbar(errorMessage(error, 'Error al convertir el prospecto'), {
        variant: 'error',
      });
    },
  });

  return {
    prospectsQuery,
    createProspectMutation,
    updateProspectMutation,
    deleteProspectMutation,
    addContactMutation,
    deleteContactMutation,
    convertProspectMutation,
  };
};

export const useProspect = (id?: string) =>
  useQuery({
    queryKey: ['prospect', id],
    queryFn: () => prospectsApi.findOne(id!),
    enabled: !!id,
  });

export const useProspectMetrics = (filters?: ProspectMetricsFilterDto) =>
  useQuery({
    queryKey: [PROSPECT_METRICS_QUERY_KEY, filters],
    queryFn: () => prospectsApi.getMetrics(filters),
  });
