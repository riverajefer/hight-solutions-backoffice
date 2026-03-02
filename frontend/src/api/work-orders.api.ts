import axiosInstance from './axios';
import {
  WorkOrder,
  WorkOrdersListResponse,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  AddSupplyToItemDto,
  FilterWorkOrdersDto,
  WorkOrderItemSupply,
} from '../types/work-order.types';

export const workOrdersApi = {
  /**
   * Get all work orders with optional filters and pagination
   */
  getAll: async (params?: FilterWorkOrdersDto): Promise<WorkOrdersListResponse> => {
    const response = await axiosInstance.get<WorkOrdersListResponse>('/work-orders', { params });
    return response.data;
  },

  /**
   * Get a single work order by ID
   */
  getById: async (id: string): Promise<WorkOrder> => {
    const response = await axiosInstance.get<WorkOrder>(`/work-orders/${id}`);
    return response.data;
  },

  /**
   * Create a new work order from an existing order
   */
  create: async (dto: CreateWorkOrderDto, confirmed = false): Promise<WorkOrder> => {
    const response = await axiosInstance.post<WorkOrder>(
      '/work-orders',
      dto,
      confirmed ? { params: { status: 'CONFIRMED' } } : undefined,
    );
    return response.data;
  },

  /**
   * Update an existing work order (only in DRAFT or CONFIRMED status)
   */
  update: async (id: string, dto: UpdateWorkOrderDto): Promise<WorkOrder> => {
    const response = await axiosInstance.patch<WorkOrder>(`/work-orders/${id}`, dto);
    return response.data;
  },

  /**
   * Update work order status
   */
  updateStatus: async (id: string, dto: UpdateWorkOrderStatusDto): Promise<WorkOrder> => {
    const response = await axiosInstance.patch<WorkOrder>(`/work-orders/${id}/status`, dto);
    return response.data;
  },

  /**
   * Delete a work order (only in DRAFT status)
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/work-orders/${id}`);
  },

  /**
   * Add or update a supply on a work order item
   */
  addSupplyToItem: async (
    workOrderId: string,
    itemId: string,
    dto: AddSupplyToItemDto,
  ): Promise<WorkOrderItemSupply> => {
    const response = await axiosInstance.post<WorkOrderItemSupply>(
      `/work-orders/${workOrderId}/items/${itemId}/supplies`,
      dto,
    );
    return response.data;
  },

  /**
   * Remove a supply from a work order item
   */
  removeSupplyFromItem: async (
    workOrderId: string,
    itemId: string,
    supplyId: string,
  ): Promise<void> => {
    await axiosInstance.delete(`/work-orders/${workOrderId}/items/${itemId}/supplies/${supplyId}`);
  },
};
