import axiosInstance from './axios';
import type {
  StepDefinition,
  UpdateFieldSchemaPayload,
  UpdateFieldSchemaResponse,
  ProductTemplate,
  ProductTemplateSummary,
  ProductionOrder,
  ProductionOrdersResponse,
  ProductionOrderStatus,
} from '../types/production.types';

export const productionApi = {
  // ─── Step Definitions ────────────────────────────────────────────────────────

  getStepDefinitions: async () => {
    const { data } = await axiosInstance.get('/step-definitions');
    return data;
  },

  getStepDefinitionById: async (id: string): Promise<StepDefinition> => {
    const { data } = await axiosInstance.get(`/step-definitions/${id}`);
    return data;
  },

  updateStepDefinitionSchema: async (
    id: string,
    payload: UpdateFieldSchemaPayload,
  ): Promise<UpdateFieldSchemaResponse> => {
    const { data } = await axiosInstance.patch(`/step-definitions/${id}/field-schema`, payload);
    return data;
  },

  // ─── Product Templates ───────────────────────────────────────────────────────

  getTemplates: async (params?: {
    category?: string;
    isActive?: boolean;
  }): Promise<ProductTemplateSummary[]> => {
    const { data } = await axiosInstance.get('/product-templates', { params });
    return data;
  },

  getTemplateById: async (id: string): Promise<ProductTemplate> => {
    const { data } = await axiosInstance.get(`/product-templates/${id}`);
    return data;
  },

  createTemplate: async (dto: {
    name: string;
    category: string;
    description?: string;
    components: Array<{
      name: string;
      order: number;
      phase: string;
      isRequired: boolean;
      steps: Array<{
        stepDefinitionId: string;
        order: number;
        isRequired: boolean;
        fieldOverrides?: Record<string, any>;
      }>;
    }>;
  }): Promise<ProductTemplate> => {
    const { data } = await axiosInstance.post('/product-templates', dto);
    return data;
  },

  updateTemplate: async (
    id: string,
    dto: { name?: string; category?: string; description?: string; isActive?: boolean; components?: any[] },
  ): Promise<ProductTemplate> => {
    const { data } = await axiosInstance.patch(`/product-templates/${id}`, dto);
    return data;
  },

  deleteTemplate: async (id: string) => {
    const { data } = await axiosInstance.delete(`/product-templates/${id}`);
    return data;
  },

  // ─── Production Orders ───────────────────────────────────────────────────────

  getOrders: async (params?: {
    status?: ProductionOrderStatus;
    search?: string;
    workOrderId?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductionOrdersResponse> => {
    const { data } = await axiosInstance.get('/production-orders', { params });
    return data;
  },

  getOrderById: async (id: string): Promise<ProductionOrder> => {
    const { data } = await axiosInstance.get(`/production-orders/${id}`);
    return data;
  },

  getOrderProgress: async (id: string) => {
    const { data } = await axiosInstance.get(`/production-orders/${id}/progress`);
    return data;
  },

  createOrder: async (dto: {
    templateId: string;
    workOrderId: string;
    notes?: string;
  }): Promise<{ id: string; code: string }> => {
    const { data } = await axiosInstance.post('/production-orders', dto);
    return data;
  },

  updateSpecification: async (
    orderId: string,
    stepId: string,
    specData: Record<string, any>,
  ) => {
    const { data } = await axiosInstance.patch(
      `/production-orders/${orderId}/steps/${stepId}/specification`,
      { data: specData },
    );
    return data;
  },

  updateExecution: async (
    orderId: string,
    stepId: string,
    execData: Record<string, any>,
  ) => {
    const { data } = await axiosInstance.patch(
      `/production-orders/${orderId}/steps/${stepId}/execution`,
      { data: execData },
    );
    return data;
  },

  completeStep: async (orderId: string, stepId: string) => {
    const { data } = await axiosInstance.patch(
      `/production-orders/${orderId}/steps/${stepId}/complete`,
    );
    return data;
  },
};
