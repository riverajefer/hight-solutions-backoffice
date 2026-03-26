export interface Cargo {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  productionAreaId: string;
  productionArea?: CargoProductionArea;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CargoProductionArea {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface CreateCargoDto {
  name: string;
  description?: string;
  productionAreaId: string;
}

export interface UpdateCargoDto {
  name?: string;
  description?: string;
  productionAreaId?: string;
  isActive?: boolean;
}

export type CargoListResponse = Cargo[];

export interface PaginatedCargoResponse {
  data: Cargo[];
  total: number;
  page: number;
  limit: number;
}
