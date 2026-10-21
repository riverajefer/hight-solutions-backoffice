import type {
  EmployeePersonalData,
  EmployeeType,
  EmployeeStatus,
  ContractType,
} from './payroll-employee.types';

/** Ficha de nómina asociada al usuario (cuando el usuario es empleado). */
export type UserPayrollEmployee = EmployeePersonalData & {
  id: string;
  employeeType: EmployeeType;
  monthlySalary: string | null;
  dailyRate: string | null;
  startDate: string;
  contractEndDate: string | null;
  contractType: ContractType | null;
  status: EmployeeStatus;
  notes: string | null;
  cargo: { id: string; name: string } | null;
};

export interface User {
  id: string;
  username?: string | null;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  profilePhoto?: string | null;
  roleId: string;
  cargoId?: string;
  role?: {
    id: string;
    name: string;
  };
  cargo?: {
    id: string;
    name: string;
    productionArea?: {
      id: string;
      name: string;
    };
  };
  payrollEmployee?: UserPayrollEmployee | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  user: User;
  permissions: string[];
}

export interface UpdateProfilePhotoDto {
  profilePhoto?: string;
}

export interface LoginDto {
  username: string;
  password: string;
  /** Token de equipo de confianza de un login anterior con doble factor. */
  deviceToken?: string;
}

export interface CreateUserDto {
  username?: string;
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  cargoId?: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  cargoId?: string | null;
  isActive?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  permissions?: string[];
}

/** Sesión que entrega el login cuando no falta ningún paso. */
export interface LoginSession extends AuthResponse {
  status: 'OK';
  /** Solo cuando se pidió recordar el navegador. */
  deviceToken?: string;
  deviceTokenExpiresAt?: string;
  /** Solo al terminar el registro del doble factor durante el login. */
  backupCodes?: string[];
}

/**
 * Respuesta de `POST /auth/login`. Con `2FA_*` todavía no hay sesión: hay que
 * completar el segundo paso con el token temporal.
 */
export type LoginResponse =
  | LoginSession
  | { status: '2FA_REQUIRED'; challengeToken: string }
  | { status: '2FA_SETUP_REQUIRED'; setupToken: string };

/** Paso del doble factor que falta después de la contraseña. */
export type PendingTwoFactor =
  | { kind: 'challenge'; token: string; username: string }
  | { kind: 'setup'; token: string; username: string };

export interface TwoFactorEnrollment {
  otpauthUrl: string;
  /** QR como imagen PNG en data URL. */
  qrCodeDataUrl: string;
  /** El secreto en grupos de 4, para escribirlo a mano. */
  manualKey: string;
}

export interface TwoFactorStatus {
  enforcement: 'off' | 'optional' | 'required';
  enabled: boolean;
  enabledAt: string | null;
  requiredByRole: boolean;
  backupCodesRemaining: number;
}

export interface TrustedDevice {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}
