export interface Permission {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionDto {
  name: string;
  description?: string;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
}

export interface BulkCreatePermissionsDto {
  permissions: CreatePermissionDto[];
}

export type PermissionListResponse = Permission[];

export interface PaginatedPermissionResponse {
  data: Permission[];
  total: number;
  page: number;
  limit: number;
}
