import type { User } from './auth.types';

export type { User };

export type UserListResponse = User[];

export interface PaginatedUserResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}
