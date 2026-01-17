import { Permission } from './permission.types';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export type RoleListResponse = Role[];

export interface PaginatedRoleResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
}
