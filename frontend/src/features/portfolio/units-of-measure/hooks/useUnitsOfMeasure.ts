import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  unitsOfMeasureApi,
  UnitOfMeasureQueryParams,
} from '../../../../api/units-of-measure.api';
import {
  CreateUnitOfMeasureDto,
  UpdateUnitOfMeasureDto,
} from '../../../../types/unit-of-measure.types';

/**
 * Custom hook for Units of Measure list and mutations
 */
export const useUnitsOfMeasure = (params?: UnitOfMeasureQueryParams) => {
  const queryClient = useQueryClient();

  // Query for fetching all units of measure
  const unitsOfMeasureQuery = useQuery({
    queryKey: ['units-of-measure', params],
    queryFn: () => unitsOfMeasureApi.getAll(params),
  });

  // Mutation for creating a unit of measure
  const createUnitOfMeasureMutation = useMutation({
    mutationFn: (data: CreateUnitOfMeasureDto) =>
      unitsOfMeasureApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
    },
  });

  // Mutation for updating a unit of measure
  const updateUnitOfMeasureMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitOfMeasureDto }) =>
      unitsOfMeasureApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
    },
  });

  // Mutation for deleting a unit of measure
  const deleteUnitOfMeasureMutation = useMutation({
    mutationFn: (id: string) => unitsOfMeasureApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });
    },
  });

  return {
    unitsOfMeasureQuery,
    createUnitOfMeasureMutation,
    updateUnitOfMeasureMutation,
    deleteUnitOfMeasureMutation,
  };
};

/**
 * Custom hook for fetching a single unit of measure
 */
export const useUnitOfMeasure = (id: string) => {
  return useQuery({
    queryKey: ['units-of-measure', id],
    queryFn: () => unitsOfMeasureApi.getById(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
