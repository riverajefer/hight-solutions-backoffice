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
