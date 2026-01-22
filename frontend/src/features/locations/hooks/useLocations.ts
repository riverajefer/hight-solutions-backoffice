import { useQuery } from '@tanstack/react-query';
import { locationsApi } from '../../../api/locations.api';

/**
 * Hook for fetching all departments
 */
export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => locationsApi.getDepartments(),
    staleTime: 1000 * 60 * 60, // 1 hour - departments don't change often
  });
};

/**
 * Hook for fetching a single department with its cities
 */
export const useDepartment = (id: string) => {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => locationsApi.getDepartmentById(id),
    enabled: !!id,
  });
};

/**
 * Hook for fetching cities by department ID
 */
export const useCitiesByDepartment = (departmentId: string) => {
  return useQuery({
    queryKey: ['cities', departmentId],
    queryFn: () => locationsApi.getCitiesByDepartment(departmentId),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook for fetching a single city
 */
export const useCity = (id: string) => {
  return useQuery({
    queryKey: ['cities', 'detail', id],
    queryFn: () => locationsApi.getCityById(id),
    enabled: !!id,
  });
};
