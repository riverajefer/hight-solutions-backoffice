import { User } from './auth.types';

export type UserListResponse = User[];

export interface PaginatedUserResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}
