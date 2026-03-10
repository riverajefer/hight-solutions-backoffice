export type InventoryMovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'RETURN' | 'INITIAL';

export interface InventoryMovementSupply {
  id: string;
  name: string;
  sku?: string | null;
  currentStock: number;
  minimumStock: number;
  consumptionUnit?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
}

export interface InventoryMovementUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface InventoryMovement {
  id: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number | null;
  previousStock: number;
  newStock: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
  supply?: InventoryMovementSupply | null;
  performedBy?: InventoryMovementUser | null;
}

export interface InventoryMovementMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryMovementsResponse {
  data: InventoryMovement[];
  meta: InventoryMovementMeta;
}

export interface CreateInventoryMovementDto {
  supplyId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  notes?: string;
}

export interface InventoryMovementFilters {
  supplyId?: string;
  type?: InventoryMovementType;
  referenceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LowStockSupply {
  id: string;
  name: string;
  sku: string | null;
  current_stock: number;
  minimum_stock: number;
  purchase_price: number | null;
  category_name: string;
  unit_name: string;
}

export interface InventoryValuationItem {
  supply_id: string;
  supply_name: string;
  sku: string | null;
  current_stock: number;
  purchase_price: number | null;
  total_value: number;
  category_name: string;
  unit_name: string;
}
