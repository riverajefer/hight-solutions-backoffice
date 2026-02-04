import axios from './axios';
import { 
  Quote, 
  CreateQuoteDto, 
  UpdateQuoteDto, 
  FilterQuotesDto 
} from '../types/quote.types';
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { Order } from '../types/order.types';

export const quotesApi = {
  findAll: async (params?: FilterQuotesDto) => {
    const { data } = await axios.get<PaginatedResponse<Quote>>('/quotes', { params });
    return data;
  },

  findOne: async (id: string) => {
    const { data } = await axios.get<Quote>(`/quotes/${id}`);
    return data;
  },

  create: async (quote: CreateQuoteDto) => {
    const { data } = await axios.post<Quote>('/quotes', quote);
    return data;
  },

  update: async (id: string, quote: UpdateQuoteDto) => {
    const { data } = await axios.patch<Quote>(`/quotes/${id}`, quote);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await axios.delete<ApiResponse<null>>(`/quotes/${id}`);
    return data;
  },

  convertToOrder: async (id: string) => {
    const { data } = await axios.post<Order>(`/quotes/${id}/convert`);
    return data;
  },
};
