import axiosInstance from './axios';
import { AuditLog, AuditLogFilters, AuditLogResponse } from '../types';

/**
 * API para gestión de logs de auditoría
 */
export const auditLogsApi = {
  /**
   * Obtener todos los logs de auditoría con filtros y paginación
   */
  getAll: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.model) params.append('model', filters.model);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await axiosInstance.get<AuditLogResponse>(
      `/audit-logs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Obtener logs de auditoría por usuario
   */
  getByUser: async (userId: string): Promise<AuditLog[]> => {
    const response = await axiosInstance.get<AuditLog[]>(
      `/audit-logs/user/${userId}`
    );
    return response.data;
  },

  /**
   * Obtener logs de auditoría por modelo
   */
  getByModel: async (modelName: string): Promise<AuditLog[]> => {
    const response = await axiosInstance.get<AuditLog[]>(
      `/audit-logs/model/${modelName}`
    );
    return response.data;
  },

  /**
   * Obtener historial de cambios de un registro específico
   */
  getRecordHistory: async (recordId: string): Promise<AuditLog[]> => {
    const response = await axiosInstance.get<AuditLog[]>(
      `/audit-logs/record/${recordId}`
    );
    return response.data;
  },

  /**
   * Obtener últimos logs de auditoría
   */
  getLatest: async (): Promise<AuditLog[]> => {
    const response = await axiosInstance.get<AuditLog[]>('/audit-logs/latest');
    return response.data;
  },
};
