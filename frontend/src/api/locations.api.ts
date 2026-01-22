import axiosInstance from './axios';
import {
  DepartmentListResponse,
  DepartmentWithCities,
  CityListResponse,
  City,
} from '../types';

export const locationsApi = {
  /**
   * Get all departments
   */
  getDepartments: async (): Promise<DepartmentListResponse> => {
    const response = await axiosInstance.get<DepartmentListResponse>(
      '/locations/departments'
    );
    return response.data;
  },

  /**
   * Get department by ID with its cities
   */
  getDepartmentById: async (id: string): Promise<DepartmentWithCities> => {
    const response = await axiosInstance.get<DepartmentWithCities>(
      `/locations/departments/${id}`
    );
    return response.data;
  },

  /**
   * Get cities by department ID
   */
  getCitiesByDepartment: async (departmentId: string): Promise<CityListResponse> => {
    const response = await axiosInstance.get<CityListResponse>(
      `/locations/departments/${departmentId}/cities`
    );
    return response.data;
  },

  /**
   * Get city by ID
   */
  getCityById: async (id: string): Promise<City> => {
    const response = await axiosInstance.get<City>(`/locations/cities/${id}`);
    return response.data;
  },
};
