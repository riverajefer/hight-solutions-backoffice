export interface Cargo {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  areaId: string;
  area?: CargoArea;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CargoArea {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface CreateCargoDto {
  name: string;
  description?: string;
  areaId: string;
}

export interface UpdateCargoDto {
  name?: string;
  description?: string;
  areaId?: string;
  isActive?: boolean;
}

export type CargoListResponse = Cargo[];

export interface PaginatedCargoResponse {
  data: Cargo[];
  total: number;
  page: number;
  limit: number;
}
