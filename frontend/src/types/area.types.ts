export interface Area {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  cargosCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AreaWithCargos extends Area {
  cargos: CargoBasic[];
}

export interface CargoBasic {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  usersCount?: number;
}

export interface CreateAreaDto {
  name: string;
  description?: string;
}

export interface UpdateAreaDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export type AreaListResponse = Area[];

export interface PaginatedAreaResponse {
  data: Area[];
  total: number;
  page: number;
  limit: number;
}
