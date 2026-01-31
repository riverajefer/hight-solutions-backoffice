export interface ProductionArea {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductionAreaDto {
  name: string;
  description?: string;
}

export interface UpdateProductionAreaDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export type ProductionAreaListResponse = ProductionArea[];

export interface PaginatedProductionAreaResponse {
  data: ProductionArea[];
  total: number;
  page: number;
  limit: number;
}
