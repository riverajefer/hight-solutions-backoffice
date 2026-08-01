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
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
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
