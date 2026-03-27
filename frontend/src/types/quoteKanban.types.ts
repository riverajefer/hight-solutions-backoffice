import { QuoteStatus } from './quote.types';

export interface QuoteKanbanColumn {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  mappedStatus: QuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteKanbanColumnDto {
  name: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  mappedStatus: QuoteStatus;
}

export interface UpdateQuoteKanbanColumnDto {
  name?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ReorderQuoteKanbanColumnsDto {
  columns: { id: string; displayOrder: number }[];
}

export interface BoardFilters {
  search?: string;
  clientId?: string;
  createdById?: string;
  dateFrom?: string;
  dateTo?: string;
}
