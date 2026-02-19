/**
 * Types for Clients module
 */

export type PersonType = 'NATURAL' | 'EMPRESA';

export interface Client {
  id: string;
  name: string;
  manager?: string;
  encargado?: string;
  phone: string;
  landlinePhone?: string;
  address?: string;
  email: string;
  departmentId: string;
  cityId: string;
  personType: PersonType;
  nit?: string;
  cedula?: string;
  specialCondition?: string | null;
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
  encargado?: string;
  phone: string;
  landlinePhone?: string;
  address?: string;
  email: string;
  departmentId: string;
  cityId: string;
  personType: PersonType;
  nit?: string;
  cedula?: string;
  specialCondition?: string;
}

export interface UpdateClientDto {
  name?: string;
  manager?: string;
  encargado?: string;
  phone?: string;
  landlinePhone?: string;
  address?: string;
  email?: string;
  departmentId?: string;
  cityId?: string;
  personType?: PersonType;
  nit?: string;
  cedula?: string;
  isActive?: boolean;
  specialCondition?: string;
}

export interface UpdateClientSpecialConditionDto {
  specialCondition?: string | null;
}

export interface ClientQueryParams {
  includeInactive?: boolean;
}

export type ClientListResponse = Client[];

export interface UploadClientRowError {
  row: number;
  error: string;
}

export interface UploadClientsResponse {
  total: number;
  successful: number;
  failed: number;
  errors: UploadClientRowError[];
}
