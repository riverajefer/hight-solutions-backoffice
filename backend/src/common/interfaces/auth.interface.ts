import { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  username: string;
  roleId: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string | null;
  roleId: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhoto?: string | null;
  cargoId?: string | null;
  role?: {
    id: string;
    name: string;
  };
  cargo?: {
    id: string;
    name: string;
    area?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
