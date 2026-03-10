import axiosInstance from './axios';
import {
  InventoryMovement,
  InventoryMovementsResponse,
  CreateInventoryMovementDto,
  InventoryMovementFilters,
  LowStockSupply,
  InventoryValuationItem,
} from '../types';

const BASE_URL = '/inventory';

export const inventoryApi = {
  /**
   * Lista movimientos de inventario con filtros y paginación
   */
  getAll: async (filters?: InventoryMovementFilters): Promise<InventoryMovementsResponse> => {
    const params = buildParams(filters);
    const { data } = await axiosInstance.get<InventoryMovementsResponse>(
      `${BASE_URL}/movements?${params.toString()}`,
    );
    return data;
  },

  /**
   * Obtiene el detalle de un movimiento
   */
  getById: async (id: string): Promise<InventoryMovement> => {
    const { data } = await axiosInstance.get<InventoryMovement>(`${BASE_URL}/movements/${id}`);
    return data;
  },

  /**
   * Registra un movimiento manual (ENTRY, ADJUSTMENT, RETURN, INITIAL)
   */
  create: async (dto: CreateInventoryMovementDto): Promise<InventoryMovement> => {
    const { data } = await axiosInstance.post<InventoryMovement>(`${BASE_URL}/movements`, dto);
    return data;
  },

  /**
   * Obtiene insumos con stock por debajo del mínimo
   */
  getLowStock: async (): Promise<LowStockSupply[]> => {
    const { data } = await axiosInstance.get<LowStockSupply[]>(`${BASE_URL}/low-stock`);
    return data;
  },

  /**
   * Obtiene valoración actual del inventario
   */
  getValuation: async (): Promise<InventoryValuationItem[]> => {
    const { data } = await axiosInstance.get<InventoryValuationItem[]>(`${BASE_URL}/valuation`);
    return data;
  },
};

function buildParams(filters?: InventoryMovementFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;

  if (filters.supplyId) params.append('supplyId', filters.supplyId);
  if (filters.type) params.append('type', filters.type);
  if (filters.referenceType) params.append('referenceType', filters.referenceType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return params;
}
