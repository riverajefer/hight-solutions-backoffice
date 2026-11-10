/** Ciclo de vida guardado del lote. */
export type SupplyLotStatus = 'AVAILABLE' | 'IN_USE' | 'DEPLETED' | 'CLOSED' | 'VOIDED';

/** Estado que se muestra: «bajo inventario» se deriva del saldo, no se guarda. */
export type SupplyLotDisplayStatus = 'AVAILABLE' | 'LOW' | 'DEPLETED' | 'CLOSED' | 'VOIDED';

export type SupplyLotView = 'active' | 'low' | 'history' | 'all';

export interface SupplyLotUnit {
  id: string;
  name: string;
  abbreviation: string;
}

export interface SupplyLotUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export interface SupplyLot {
  id: string;
  code: string;
  sequence: number;
  supply: { id: string; name: string; lotPrefix: string | null; consumptionUnit: SupplyLotUnit };
  status: SupplyLotStatus;
  displayStatus: SupplyLotDisplayStatus;
  initialQuantity: number;
  remainingQuantity: number;
  consumedQuantity: number;
  consumedPercent: number;
  lowStockQuantity: number;
  unitCost: number;
  totalCost: number;
  remainingValue: number;
  receivedAt: string;
  depletedAt: string | null;
  notes: string | null;
  voidReason: string | null;
  createdBy: SupplyLotUser;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyLotMovement {
  id: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'RETURN' | 'INITIAL';
  quantity: number;
  unitCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  performedBy: SupplyLotUser;
}

export interface SupplyLotDetail extends SupplyLot {
  movements: SupplyLotMovement[];
}

export interface SupplyLotsResponse {
  data: SupplyLot[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SupplyLotFilters {
  supplyId?: string;
  view?: SupplyLotView;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SupplyLotSummary {
  supplyId: string;
  supplyName: string;
  lotPrefix: string | null;
  unit: SupplyLotUnit;
  lowStockPercent: number;
  activeLots: number;
  lowLots: number;
  remainingQuantity: number;
  remainingValue: number;
}

/** Se envía `unitCost` o `totalCost`, nunca ambos. */
export interface CreateSupplyLotDto {
  supplyId: string;
  initialQuantity: number;
  unitCost?: number;
  totalCost?: number;
  receivedAt: string;
  notes?: string;
}
