/**
 * Product entity (matches backend model)
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice?: number;
  priceUnit?: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * DTO for creating a product
 */
export interface CreateProductDto {
  name: string;
  slug?: string;
  description?: string;
  basePrice?: number;
  priceUnit?: string;
  categoryId: string;
}

/**
 * DTO for updating a product (all fields optional except categoryId)
 */
export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  basePrice?: number;
  priceUnit?: string;
  categoryId?: string;
}

/**
 * API response type for list endpoint
 */
export type ProductListResponse = Product[];
