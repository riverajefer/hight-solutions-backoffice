/**
 * Service Category entity (matches backend model)
 */
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  servicesCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a service category
 */
export interface CreateServiceCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * DTO for updating a service category (all fields optional)
 */
export interface UpdateServiceCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * API response type for list endpoint
 */
export type ServiceCategoryListResponse = ServiceCategory[];
