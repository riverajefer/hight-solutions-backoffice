/**
 * Unit of Measure entity (matches backend model)
 */
export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a unit of measure
 */
export interface CreateUnitOfMeasureDto {
  name: string;
  abbreviation: string;
  description?: string;
}

/**
 * DTO for updating a unit of measure (all fields optional)
 */
export interface UpdateUnitOfMeasureDto {
  name?: string;
  abbreviation?: string;
  description?: string;
}

/**
 * API response type for list endpoint
 */
export type UnitOfMeasureListResponse = UnitOfMeasure[];
