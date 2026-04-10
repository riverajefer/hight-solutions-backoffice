import axiosInstance from './axios';
import type {
  CashRegister,
  CashSession,
  CashMovement,
  BalancePreview,
  CashSessionsListResponse,
  CashMovementsListResponse,
  CreateCashRegisterDto,
  UpdateCashRegisterDto,
  OpenCashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  VoidCashMovementDto,
  FilterCashSessionsDto,
  FilterCashMovementsDto,
} from '../types/cash-register.types';

// ── Cash Registers ───────────────────────────────────────────────────────────

export const cashRegisterApi = {
  getAllRegisters: async (): Promise<CashRegister[]> => {
    const { data } = await axiosInstance.get<CashRegister[]>('/cash-registers');
    return data;
  },

  getRegisterById: async (id: string): Promise<CashRegister> => {
    const { data } = await axiosInstance.get<CashRegister>(`/cash-registers/${id}`);
    return data;
  },

  createRegister: async (dto: CreateCashRegisterDto): Promise<CashRegister> => {
    const { data } = await axiosInstance.post<CashRegister>('/cash-registers', dto);
    return data;
  },

  updateRegister: async (id: string, dto: UpdateCashRegisterDto): Promise<CashRegister> => {
    const { data } = await axiosInstance.put<CashRegister>(`/cash-registers/${id}`, dto);
    return data;
  },

  deleteRegister: async (id: string): Promise<{ message: string }> => {
    const { data } = await axiosInstance.delete<{ message: string }>(`/cash-registers/${id}`);
    return data;
  },

  // ── Cash Sessions ─────────────────────────────────────────────────────────

  openSession: async (dto: OpenCashSessionDto): Promise<CashSession> => {
    const { data } = await axiosInstance.post<CashSession>('/cash-sessions/open', dto);
    return data;
  },

  closeSession: async (id: string, dto: CloseCashSessionDto): Promise<CashSession> => {
    const { data } = await axiosInstance.post<CashSession>(`/cash-sessions/${id}/close`, dto);
    return data;
  },

  getBalancePreview: async (id: string): Promise<BalancePreview> => {
    const { data } = await axiosInstance.get<BalancePreview>(`/cash-sessions/${id}/balance-preview`);
    return data;
  },

  getSessionById: async (id: string): Promise<CashSession> => {
    const { data } = await axiosInstance.get<CashSession>(`/cash-sessions/${id}`);
    return data;
  },

  getSessions: async (params?: FilterCashSessionsDto): Promise<CashSessionsListResponse> => {
    const { data } = await axiosInstance.get<CashSessionsListResponse>('/cash-sessions', { params });
    return data;
  },

  // ── Cash Movements ────────────────────────────────────────────────────────

  createMovement: async (dto: CreateCashMovementDto): Promise<CashMovement> => {
    const { data } = await axiosInstance.post<CashMovement>('/cash-movements', dto);
    return data;
  },

  voidMovement: async (id: string, dto: VoidCashMovementDto): Promise<CashMovement> => {
    const { data } = await axiosInstance.post<CashMovement>(`/cash-movements/${id}/void`, dto);
    return data;
  },

  getMovements: async (params?: FilterCashMovementsDto): Promise<CashMovementsListResponse> => {
    const { data } = await axiosInstance.get<CashMovementsListResponse>('/cash-movements', { params });
    return data;
  },
};
