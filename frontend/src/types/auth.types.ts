export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  role?: {
    id: string;
    name: string;
  };
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  permissions?: string[];
}
