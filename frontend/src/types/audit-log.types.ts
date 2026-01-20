/**
 * Tipos para el módulo de Audit Logs
 */

export interface AuditLog {
  id: string;
  userId: string | null;
  recordId: string;
  action: string;
  model: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[] | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
