import axiosInstance from './axios';
import {
  AttendanceStatus,
  AttendanceResponse,
  AttendanceRecord,
  AttendanceFilter,
  ClockOutDto,
  AdjustAttendanceDto,
} from '../types';

const BASE_URL = '/attendance';

export const attendanceApi = {
  /**
   * Marca entrada de asistencia
   */
  clockIn: async (): Promise<AttendanceRecord> => {
    const { data } = await axiosInstance.post<AttendanceRecord>(`${BASE_URL}/clock-in`);
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
  if (filters.areaId) params.append('areaId', filters.areaId);
  if (filters.cargoId) params.append('cargoId', filters.cargoId);
  if (filters.type) params.append('type', filters.type);
  if (filters.source) params.append('source', filters.source);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return params;
}
