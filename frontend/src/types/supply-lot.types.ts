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
  /** Consumido por OP (sin merma). */
  consumedQuantity: number;
  /** Merma: saldo al cerrar y devoluciones a rollos ya terminados. */
  wasteQuantity: number;
  wasteValue: number;
  /** % del rollo que ya no está (consumo + merma). */
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
  /** Línea de OG con que se compró (se excluye de la rentabilidad de la OP). */
  purchaseLine: SupplyLotPurchaseLine | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyLotPurchaseLine {
  id: string;
  name: string;
  total: number;
  expenseOrderId: string;
  ogNumber: string;
}

/** Línea de OG candidata para amarrar la compra de un rollo. */
export interface PurchaseLineCandidate {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  total: number;
  createdAt: string;
  expenseOrder: { id: string; ogNumber: string; status: string };
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
  expenseOrderItemId?: string;
  notes?: string;
}

export type MaterialConsumptionSource = 'AUTO' | 'MANUAL';

/** Consumo vigente de un ítem de OP. Sin `lot` = pendiente de asignar a un rollo. */
export interface OrderMaterialConsumption {
  id: string;
  orderItemId: string | null;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  source: MaterialConsumptionSource;
  lot: { id: string; code: string } | null;
  supply: { id: string; name: string; consumptionUnit: { abbreviation: string } };
}

/** Corrección manual de un ítem × insumo. Con `quantity: 0` = no gastó (lo puso el cliente). */
export interface OrderMaterialOverride {
  orderItemId: string;
  quantity: number;
  note: string | null;
  updatedAt: string;
  supply: { id: string; name: string; consumptionUnit: { abbreviation: string } };
  createdBy: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface OrderMaterials {
  rows: OrderMaterialConsumption[];
  overrides: OrderMaterialOverride[];
}

/** Regla de la receta: cuánto de un insumo con rollos gasta cada unidad vendida. */
export interface ProductSupplyRule {
  id: string;
  supplyId: string;
  factor: number;
  isActive: boolean;
  effectiveFrom: string;
  updatedAt: string;
  supply: {
    id: string;
    name: string;
    lotPrefix: string | null;
    trackLots: boolean;
    isActive: boolean;
    consumptionUnit: { abbreviation: string };
  };
}

export interface PendingMaterialConsumption {
  id: string;
  quantity: number;
  source: MaterialConsumptionSource;
  createdAt: string;
  supply: { id: string; name: string; consumptionUnit: { abbreviation: string } };
  order: { id: string; orderNumber: string; client: { name: string } };
  orderItem: { id: string; description: string } | null;
}

export interface LotMaterialConsumption {
  id: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  /** Venta sin IVA del ítem atribuible a los metros que salieron de este rollo. */
  revenue: number;
  source: MaterialConsumptionSource;
  createdAt: string;
  order: { id: string; orderNumber: string; status: string; client: { name: string } };
  orderItem: { id: string; description: string } | null;
}

export interface LotProfitabilitySummary {
  acquisitionCost: number;
  consumedQuantity: number;
  consumedValue: number;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  wasteQuantity: number;
  wasteValue: number;
  profitAfterWaste: number;
  remainingQuantity: number;
  remainingValue: number;
  orders: number;
}

export interface LotConsumptionReport {
  summary: LotProfitabilitySummary;
  rows: LotMaterialConsumption[];
}
