import type { QuoteStatus } from './quote.types';

export type QuoteRestoreRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

interface UserBasic {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface QuoteRestoreRequest {
  id: string;
  quoteId: string;
  requestedById: string;
  restoreToStatus: QuoteStatus;
  previousRejectionReason?: string | null;
  previousRejectedAt?: string | null;
  reason: string;
  status: QuoteRestoreRequestStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  quote?: {
    id: string;
    quoteNumber: string;
    status: QuoteStatus;
    client?: { id: string; name: string } | null;
  };
  requestedBy?: UserBasic;
  reviewedBy?: UserBasic | null;
}

export interface CreateQuoteRestoreRequestDto {
  quoteId: string;
  reason: string;
}

export interface ApproveQuoteRestoreRequestDto {
  reviewNotes?: string;
}

export interface RejectQuoteRestoreRequestDto {
  reviewNotes: string;
}
