import axiosInstance from './axios';
import {
  LoginResponse,
  LoginSession,
  TrustedDevice,
  TwoFactorEnrollment,
  TwoFactorStatus,
} from '../types';

export const twoFactorApi = {
  // ─── Segundo paso del login (con el token temporal) ──────────────────────

  /** Código de la app o de respaldo. */
  verifyLogin: async (data: {
    challengeToken: string;
    code: string;
    rememberDevice: boolean;
  }): Promise<LoginSession> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/2fa/verify', data);
    return response.data as LoginSession;
  },

  /** Registro obligatorio: genera el QR. */
  startLoginEnrollment: async (setupToken: string): Promise<TwoFactorEnrollment> => {
    const response = await axiosInstance.post<TwoFactorEnrollment>('/auth/2fa/enrollment/start', {
      setupToken,
    });
    return response.data;
  },

  /** Registro obligatorio: confirma el primer código; devuelve la sesión y los códigos de respaldo. */
  confirmLoginEnrollment: async (data: {
    setupToken: string;
    code: string;
    rememberDevice: boolean;
  }): Promise<LoginSession> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/2fa/enrollment/confirm', data);
    return response.data as LoginSession;
  },

  // ─── Autogestión (sesión normal) ─────────────────────────────────────────

  getStatus: async (): Promise<TwoFactorStatus> => {
    const response = await axiosInstance.get<TwoFactorStatus>('/auth/2fa/status');
    return response.data;
  },

  setup: async (): Promise<TwoFactorEnrollment> => {
    const response = await axiosInstance.post<TwoFactorEnrollment>('/auth/2fa/setup');
    return response.data;
  },

  enable: async (code: string): Promise<{ backupCodes: string[] }> => {
    const response = await axiosInstance.post<{ backupCodes: string[] }>('/auth/2fa/enable', { code });
    return response.data;
  },

  disable: async (data: { password: string; code: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/2fa/disable', data);
    return response.data;
  },

  regenerateBackupCodes: async (code: string): Promise<{ backupCodes: string[] }> => {
    const response = await axiosInstance.post<{ backupCodes: string[] }>('/auth/2fa/backup-codes', {
      code,
    });
    return response.data;
  },

  getTrustedDevices: async (): Promise<TrustedDevice[]> => {
    const response = await axiosInstance.get<TrustedDevice[]>('/auth/2fa/trusted-devices');
    return response.data;
  },

  revokeTrustedDevice: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/auth/2fa/trusted-devices/${id}`);
  },

  // ─── Administración ──────────────────────────────────────────────────────

  /** Restablece el doble factor de otro usuario (permiso `reset_user_2fa`). */
  resetForUser: async (userId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(`/users/${userId}/2fa/reset`);
    return response.data;
  },

  /** Exige o deja de exigir el doble factor a otro usuario (permiso `require_user_2fa`). */
  setRequirementForUser: async (
    userId: string,
    required: boolean,
  ): Promise<{ id: string; requireTwoFactor: boolean }> => {
    const response = await axiosInstance.patch<{ id: string; requireTwoFactor: boolean }>(
      `/users/${userId}/2fa/requirement`,
      { required },
    );
    return response.data;
  },
};
