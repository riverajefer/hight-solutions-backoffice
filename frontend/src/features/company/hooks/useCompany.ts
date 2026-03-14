import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { companyApi } from '../../../api/company.api';
import type { UpsertCompanyDto } from '../../../types/company.types';

const COMPANY_QUERY_KEY = ['company'];

export const useCompany = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const companyQuery = useQuery({
    queryKey: COMPANY_QUERY_KEY,
    queryFn: () => companyApi.get(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: UpsertCompanyDto) => companyApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_QUERY_KEY });
      enqueueSnackbar('Información de la compañía guardada exitosamente', {
        variant: 'success',
      });
    },
    onError: () => {
      enqueueSnackbar('Error al guardar la información de la compañía', {
        variant: 'error',
      });
    },
  });

  return { companyQuery, upsertMutation };
};
