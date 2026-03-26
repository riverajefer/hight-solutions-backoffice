import axiosInstance from './axios';
import { Comment, CommentAuthor, CommentEntityType, CreateCommentDto } from '../types';

const BASE_URL = '/comments';

export const commentsApi = {
  getByEntity: async (entityType: CommentEntityType, entityId: string): Promise<Comment[]> => {
    const { data } = await axiosInstance.get<Comment[]>(BASE_URL, {
      params: { entityType, entityId },
    });
    return data;
  },

  create: async (dto: CreateCommentDto): Promise<Comment> => {
    const { data } = await axiosInstance.post<Comment>(BASE_URL, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE_URL}/${id}`);
  },

  searchMentionable: async (q: string): Promise<CommentAuthor[]> => {
    const { data } = await axiosInstance.get<CommentAuthor[]>(`${BASE_URL}/mentions`, {
      params: { q },
    });
    return data;
  },
};
