import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cargosApi, CargoQueryParams } from '../../../api/cargos.api';
import { CreateCargoDto, UpdateCargoDto } from '../../../types';

export const useCargos = (params?: CargoQueryParams) => {
  const queryClient = useQueryClient();

  const cargosQuery = useQuery({
    queryKey: ['cargos', params],
    queryFn: () => cargosApi.getAll(params),
  });

  const createCargoMutation = useMutation({
    mutationFn: (data: CreateCargoDto) => cargosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });

  const updateCargoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCargoDto }) =>
      cargosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });

  const deleteCargoMutation = useMutation({
    mutationFn: (id: string) => cargosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });

  return {
    cargosQuery,
    createCargoMutation,
    updateCargoMutation,
    deleteCargoMutation,
  };
};

export const useCargo = (id: string) => {
  return useQuery({
    queryKey: ['cargos', id],
    queryFn: () => cargosApi.getById(id),
    enabled: !!id,
  });
};

export const useCargosByArea = (areaId: string, params?: CargoQueryParams) => {
  return useQuery({
    queryKey: ['cargos', 'area', areaId, params],
    queryFn: () => cargosApi.getByArea(areaId, params),
    enabled: !!areaId,
  });
};
