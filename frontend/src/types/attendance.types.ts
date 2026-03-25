export type AttendanceType = 'MANUAL' | 'AUTO';
export type AttendanceSource = 'BUTTON' | 'INACTIVITY' | 'LOGOUT' | 'SYSTEM';

export interface AttendanceUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cargo?: {
    id: string;
    name: string;
    productionArea: {
      id: string;
      name: string;
    };
  };
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  type: AttendanceType;
  source: AttendanceSource;
  notes?: string;
  metadata?: Record<string, any>;
  totalMinutes?: number;
  createdAt: string;
  updatedAt: string;
  user?: AttendanceUser;
}

export interface AttendanceStatus {
  active: boolean;
  record: AttendanceRecord | null;
}

export interface AttendanceMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceResponse {
  data: AttendanceRecord[];
  meta: AttendanceMeta;
}

export interface AttendanceFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  productionAreaId?: string;
  cargoId?: string;
  type?: AttendanceType;
  source?: AttendanceSource;
  page?: number;
  limit?: number;
}

export interface ClockInDto {
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ClockOutDto {
  notes?: string;
}

export interface AdjustAttendanceDto {
  clockIn?: string;
  clockOut?: string;
  notes?: string;
  reason: string;
}
