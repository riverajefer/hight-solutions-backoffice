/**
 * Supply Category entity (matches backend model)
 */
export interface SupplyCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  suppliesCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a supply category
 */
export interface CreateSupplyCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * DTO for updating a supply category (all fields optional)
 */
export interface UpdateSupplyCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * API response type for list endpoint
 */
export type SupplyCategoryListResponse = SupplyCategory[];
