import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionAreasApi, ProductionAreaQueryParams } from '../../../api/production-areas.api';
import { CreateProductionAreaDto, UpdateProductionAreaDto } from '../../../types';

export const useProductionAreas = (params?: ProductionAreaQueryParams) => {
  const queryClient = useQueryClient();

  const productionAreasQuery = useQuery({
    queryKey: ['production-areas', params],
    queryFn: () => productionAreasApi.getAll(params),
  });

  const createProductionAreaMutation = useMutation({
    mutationFn: (data: CreateProductionAreaDto) => productionAreasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-areas'] });
    },
  });

  const updateProductionAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductionAreaDto }) =>
      productionAreasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-areas'] });
    },
  });

  const deleteProductionAreaMutation = useMutation({
    mutationFn: (id: string) => productionAreasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-areas'] });
    },
  });

  return {
    productionAreasQuery,
    createProductionAreaMutation,
    updateProductionAreaMutation,
    deleteProductionAreaMutation,
  };
};

export const useProductionArea = (id: string) => {
  return useQuery({
    queryKey: ['production-areas', id],
    queryFn: () => productionAreasApi.getById(id),
    enabled: !!id,
  });
};
