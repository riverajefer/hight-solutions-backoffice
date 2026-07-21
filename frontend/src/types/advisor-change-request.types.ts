export type AdvisorChangeRequestStatus =
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

export interface AdvisorChangeRequest {
  id: string;
  orderId: string;
  requestedById: string;
  currentAdvisorId: string;
  requestedAdvisorId: string;
  reason?: string | null;
  status: AdvisorChangeRequestStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  requestedBy?: UserBasic;
  reviewedBy?: UserBasic;
  currentAdvisor?: UserBasic;
  requestedAdvisor?: UserBasic;
}

export interface CreateAdvisorChangeRequestDto {
  orderId: string;
  requestedAdvisorId: string;
  reason?: string;
}

export interface ApproveAdvisorChangeRequestDto {
  reviewNotes?: string;
}

export interface RejectAdvisorChangeRequestDto {
  reviewNotes: string;
}
