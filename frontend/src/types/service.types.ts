/**
 * Service entity (matches backend model)
 */
export interface Service {
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
 * DTO for creating a service
 */
export interface CreateServiceDto {
  name: string;
  slug: string;
  description?: string;
  basePrice?: number;
  priceUnit?: string;
  categoryId: string;
}

/**
 * DTO for updating a service (all fields optional except categoryId)
 */
export interface UpdateServiceDto {
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
export type ServiceListResponse = Service[];
