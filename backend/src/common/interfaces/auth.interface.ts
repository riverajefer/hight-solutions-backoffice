import { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  username: string;
  roleId: string;
  // `2fa_*`: tokens temporales del segundo paso del login; JwtStrategy los rechaza.
  type: 'access' | 'refresh' | '2fa_challenge' | '2fa_setup';
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
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
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
    } | null;
  } | null;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
