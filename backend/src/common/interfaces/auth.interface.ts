import { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  roleId: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
