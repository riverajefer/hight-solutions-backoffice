/**
 * Types for Client Ownership Authorization Requests module
 */

export type ClientOwnershipAuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface UserBasic {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ClientOwnershipAuthRequest {
  id: string;
  orderId: string;
  requestedById: string;
  advisorId: string;
  reason: string | null;
  status: ClientOwnershipAuthStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: UserBasic;
  advisor: UserBasic;
  reviewedBy?: UserBasic | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

export interface ApproveClientOwnershipAuthRequestDto {
  reviewNotes?: string;
}

export interface RejectClientOwnershipAuthRequestDto {
  reviewNotes: string;
}
