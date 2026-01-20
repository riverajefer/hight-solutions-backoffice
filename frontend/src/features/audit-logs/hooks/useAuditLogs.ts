import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../../../api';
import { AuditLogFilters } from '../../../types';

/**
 * Hook para gestionar los logs de auditoría
 * Solo incluye queries (lectura), sin mutations ya que los logs son solo de visualización
 */
export const useAuditLogs = (filters?: AuditLogFilters) => {
  // Query principal con filtros
  const auditLogsQuery = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditLogsApi.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Query para obtener últimos logs
  const latestLogsQuery = useQuery({
    queryKey: ['audit-logs', 'latest'],
    queryFn: () => auditLogsApi.getLatest(),
    enabled: !filters, // Solo se ejecuta si no hay filtros activos
  });

  return {
    auditLogsQuery,
    latestLogsQuery,
  };
};

/**
 * Hook para obtener logs de un usuario específico
 */
export const useUserAuditLogs = (userId: string) => {
  return useQuery({
    queryKey: ['audit-logs', 'user', userId],
    queryFn: () => auditLogsApi.getByUser(userId),
    enabled: !!userId,
  });
};

/**
 * Hook para obtener logs de un modelo específico
 */
export const useModelAuditLogs = (modelName: string) => {
  return useQuery({
    queryKey: ['audit-logs', 'model', modelName],
    queryFn: () => auditLogsApi.getByModel(modelName),
    enabled: !!modelName,
  });
};

/**
 * Hook para obtener historial de un registro específico
 */
export const useRecordHistory = (recordId: string) => {
  return useQuery({
    queryKey: ['audit-logs', 'record', recordId],
    queryFn: () => auditLogsApi.getRecordHistory(recordId),
    enabled: !!recordId,
  });
};
