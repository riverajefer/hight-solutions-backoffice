/**
 * Types for Colombian Departments and Cities
 */

export interface Department {
  id: string;
  name: string;
  code: string;
  citiesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentWithCities extends Omit<Department, 'citiesCount'> {
  cities: City[];
}

export interface City {
  id: string;
  name: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

export type DepartmentListResponse = Department[];
export type CityListResponse = City[];
