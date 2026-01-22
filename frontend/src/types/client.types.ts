/**
 * Types for Clients module
 */

export type PersonType = 'NATURAL' | 'EMPRESA';

export interface Client {
  id: string;
  name: string;
  manager?: string;
  phone?: string;
  address?: string;
  email: string;
  departmentId: string;
  cityId: string;
  personType: PersonType;
  nit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  city?: {
    id: string;
    name: string;
  };
}

export interface CreateClientDto {
  name: string;
  manager?: string;
  phone?: string;
  address?: string;
  email: string;
  departmentId: string;
  cityId: string;
  personType: PersonType;
  nit?: string;
}

export interface UpdateClientDto {
  name?: string;
  manager?: string;
  phone?: string;
  address?: string;
  email?: string;
  departmentId?: string;
  cityId?: string;
  personType?: PersonType;
  nit?: string;
  isActive?: boolean;
}

export interface ClientQueryParams {
  includeInactive?: boolean;
}

export type ClientListResponse = Client[];
