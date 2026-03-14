/**
 * Types for Suppliers module
 */

import type { PersonType } from './client.types';

export interface Supplier {
  id: string;
  name: string;
  encargado?: string;
  phone?: string;
  landlinePhone?: string;
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

export interface CreateSupplierDto {
  name: string;
  encargado?: string;
  phone?: string;
  landlinePhone?: string;
  address?: string;
  email: string;
  departmentId: string;
  cityId: string;
  personType: PersonType;
  nit?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  encargado?: string;
  phone?: string;
  landlinePhone?: string;
  address?: string;
  email?: string;
  departmentId?: string;
  cityId?: string;
  personType?: PersonType;
  nit?: string;
  isActive?: boolean;
}

export interface SupplierQueryParams {
  includeInactive?: boolean;
}

export type SupplierListResponse = Supplier[];

// Re-export PersonType for convenience
export type { PersonType } from './client.types';
