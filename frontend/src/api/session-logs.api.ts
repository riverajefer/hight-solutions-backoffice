import axiosInstance from './axios';
import { SessionLogsFilter, SessionLogsResponse, SessionLog } from '../types';

const BASE_URL = '/session-logs';

export const sessionLogsApi = {
  /**
   * Get all session logs with filters and pagination
   */
  getAll: async (filters?: SessionLogsFilter): Promise<SessionLogsResponse> => {
    const params = new URLSearchParams();

    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const { data } = await axiosInstance.get<SessionLogsResponse>(
      `${BASE_URL}?${params.toString()}`
    );
    return data;
  },

  /**
   * Get session logs for a specific user
   */
  getByUserId: async (
    userId: string,
    page = 1,
    limit = 10
  ): Promise<SessionLogsResponse> => {
    const { data } = await axiosInstance.get<SessionLogsResponse>(
      `${BASE_URL}/user/${userId}?page=${page}&limit=${limit}`
    );
    return data;
  },

  /**
   * Get all active sessions
   */
  getActiveSessions: async (): Promise<SessionLog[]> => {
    const { data } = await axiosInstance.get<SessionLog[]>(`${BASE_URL}/active`);
    return data;
  },
};
