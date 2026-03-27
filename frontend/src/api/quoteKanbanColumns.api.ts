import axiosInstance from './axios';
import {
  QuoteKanbanColumn,
  CreateQuoteKanbanColumnDto,
  UpdateQuoteKanbanColumnDto,
  ReorderQuoteKanbanColumnsDto,
} from '../types/quoteKanban.types';

export const quoteKanbanColumnsApi = {
  findAll: async (): Promise<QuoteKanbanColumn[]> => {
    const { data } = await axiosInstance.get<QuoteKanbanColumn[]>('/quote-kanban-columns');
    return data;
  },

  findAllIncludingInactive: async (): Promise<QuoteKanbanColumn[]> => {
    const { data } = await axiosInstance.get<QuoteKanbanColumn[]>('/quote-kanban-columns/all');
    return data;
  },

  create: async (dto: CreateQuoteKanbanColumnDto): Promise<QuoteKanbanColumn> => {
    const { data } = await axiosInstance.post<QuoteKanbanColumn>('/quote-kanban-columns', dto);
    return data;
  },

  update: async (id: string, dto: UpdateQuoteKanbanColumnDto): Promise<QuoteKanbanColumn> => {
    const { data } = await axiosInstance.patch<QuoteKanbanColumn>(`/quote-kanban-columns/${id}`, dto);
    return data;
  },

  reorder: async (dto: ReorderQuoteKanbanColumnsDto): Promise<QuoteKanbanColumn[]> => {
    const { data } = await axiosInstance.patch<QuoteKanbanColumn[]>('/quote-kanban-columns/reorder', dto);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/quote-kanban-columns/${id}`);
  },
};
