import { Client } from './client.types';
import type { User } from './user.types';
import { CommercialChannel } from './commercialChannel.types';
import { Product } from './product.types';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
}

export const QUOTE_STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  [QuoteStatus.DRAFT]: { label: 'Borrador', color: 'default' },
  [QuoteStatus.SENT]: { label: 'Enviada', color: 'info' },
  [QuoteStatus.ACCEPTED]: { label: 'Aceptada', color: 'success' },
  [QuoteStatus.REJECTED]: { label: 'Rechazada', color: 'error' },
  [QuoteStatus.CONVERTED]: { label: 'Convertida', color: 'secondary' },
  [QuoteStatus.CANCELLED]: { label: 'Cancelada', color: 'error' },
};


export interface QuoteItem {
  id: string;
  quoteId: string;
  productId?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
  specifications?: any;
  sampleImageId?: string;
  sortOrder: number;
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  quoteDate: string;
  validUntil?: string;
  subtotal: number | string;
  taxRate: number | string;
  tax: number | string;
  total: number | string;
  status: QuoteStatus;
  notes?: string;
  createdById: string;
  commercialChannelId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  client?: Client;
  createdBy?: User;
  commercialChannel?: CommercialChannel;
  items?: QuoteItem[];
  orderId?: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

export interface CreateQuoteItemDto {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  specifications?: any;
  sampleImageId?: string;
}

export interface CreateQuoteDto {
  clientId: string;
  validUntil?: string;
  notes?: string;
  items: CreateQuoteItemDto[];
  commercialChannelId?: string;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
  status?: QuoteStatus;
}

export interface FilterQuotesDto {
  status?: QuoteStatus;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
