/**
 * Supply entity (matches backend model)
 */
export interface Supply {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  categoryId: string;
  purchasePrice?: number;
  purchaseUnitId: string;
  consumptionUnitId: string;
  conversionFactor: number;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  purchaseUnit?: {
    id: string;
    name: string;
    abbreviation: string;
  };
  consumptionUnit?: {
    id: string;
    name: string;
    abbreviation: string;
  };
}

/**
 * DTO for creating a supply
 */
export interface CreateSupplyDto {
  name: string;
  sku?: string;
  description?: string;
  categoryId: string;
  purchasePrice?: number;
  purchaseUnitId: string;
  consumptionUnitId: string;
  conversionFactor?: number;
  currentStock?: number;
  minimumStock?: number;
}

/**
 * DTO for updating a supply (all fields optional except relations)
 */
export interface UpdateSupplyDto {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  purchasePrice?: number;
  purchaseUnitId?: string;
  consumptionUnitId?: string;
  conversionFactor?: number;
  currentStock?: number;
  minimumStock?: number;
}

/**
 * API response type for list endpoint
 */
export type SupplyListResponse = Supply[];
