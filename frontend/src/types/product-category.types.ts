/**
 * Product Category entity (matches backend model)
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  productsCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a product category
 */
export interface CreateProductCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * DTO for updating a product category (all fields optional)
 */
export interface UpdateProductCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

/**
 * API response type for list endpoint
 */
export type ProductCategoryListResponse = ProductCategory[];
