export interface SessionLog {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  durationMinutes: number | null;
  durationFormatted: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    cargo: {
      id: string;
      name: string;
      area: {
        id: string;
        name: string;
      };
    } | null;
  };
}

export interface SessionLogsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionLogsResponse {
  data: SessionLog[];
  meta: SessionLogsMeta;
}

export interface SessionLogsFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  page?: number;
  limit?: number;
}
