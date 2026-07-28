/**
 * Types for Client Advisor Assignment Requests module
 */

export type ClientAdvisorRequestStatus =
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

export interface ClientAdvisorRequest {
  id: string;
  clientId: string;
  requestedById: string;
  requestedAdvisorId: string;
  reason: string | null;
  status: ClientAdvisorRequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy?: UserBasic;
  requestedAdvisor: UserBasic;
  reviewedBy?: UserBasic | null;
  client?: {
    id: string;
    name: string;
  };
}

export interface CreateClientAdvisorRequestDto {
  clientId: string;
  requestedAdvisorId: string;
  reason?: string;
}

export interface ApproveClientAdvisorRequestDto {
  reviewNotes?: string;
}

export interface RejectClientAdvisorRequestDto {
  reviewNotes: string;
}
