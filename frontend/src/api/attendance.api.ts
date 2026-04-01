import axiosInstance from './axios';
import {
  AttendanceStatus,
  AttendanceResponse,
  AttendanceRecord,
  AttendanceFilter,
  ClockOutDto,
  AdjustAttendanceDto,
  ClockInDto,
  AttendanceSummary,
} from '../types';

const BASE_URL = '/attendance';

export const attendanceApi = {
  /**
   * Marca entrada de asistencia
   */
  clockIn: async (dto?: ClockInDto): Promise<AttendanceRecord> => {
    const { data } = await axiosInstance.post<AttendanceRecord>(`${BASE_URL}/clock-in`, dto || {});
    return data;
  },

  /**
   * Marca salida de asistencia con nota opcional
   */
  clockOut: async (dto?: ClockOutDto): Promise<AttendanceRecord> => {
    const { data } = await axiosInstance.post<AttendanceRecord>(`${BASE_URL}/clock-out`, dto || {});
    return data;
  },

  /**
   * Obtiene el estado actual de asistencia del usuario autenticado
   */
  getMyStatus: async (): Promise<AttendanceStatus> => {
    const { data } = await axiosInstance.get<AttendanceStatus>(`${BASE_URL}/my-status`);
    return data;
  },

  /**
   * Obtiene el resumen de asistencia del usuario en sesión
   */
  getMySummary: async (filters?: { startDate?: string; endDate?: string }): Promise<AttendanceSummary> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    const { data } = await axiosInstance.get<AttendanceSummary>(
      `${BASE_URL}/my-summary${query ? `?${query}` : ''}`
    );
    return data;
  },

  /**
   * Obtiene los registros propios con filtros
   */
  getMyRecords: async (filters?: AttendanceFilter): Promise<AttendanceResponse> => {
    const params = buildParams(filters);
    const { data } = await axiosInstance.get<AttendanceResponse>(
      `${BASE_URL}/my-records?${params.toString()}`
    );
    return data;
  },

  /**
   * (Admin/Manager) Obtiene todos los registros con filtros
   */
  getAll: async (filters?: AttendanceFilter): Promise<AttendanceResponse> => {
    const params = buildParams(filters);
    const { data } = await axiosInstance.get<AttendanceResponse>(
      `${BASE_URL}/records?${params.toString()}`
    );
    return data;
  },

  /**
   * Registra un heartbeat de actividad
   */
  heartbeat: async (): Promise<void> => {
    await axiosInstance.post(`${BASE_URL}/heartbeat`);
  },

  /**
   * (Admin) Ajusta un registro de asistencia
   */
  adjustRecord: async (id: string, dto: AdjustAttendanceDto): Promise<AttendanceRecord> => {
    const { data } = await axiosInstance.patch<AttendanceRecord>(`${BASE_URL}/${id}/adjust`, dto);
    return data;
  },
};

function buildParams(filters?: AttendanceFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;

  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.productionAreaId) params.append('productionAreaId', filters.productionAreaId);
  if (filters.cargoId) params.append('cargoId', filters.cargoId);
  if (filters.type) params.append('type', filters.type);
  if (filters.source) params.append('source', filters.source);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return params;
}
