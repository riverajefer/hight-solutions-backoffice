export enum EditRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationType {
  EDIT_REQUEST_PENDING = 'EDIT_REQUEST_PENDING',
  EDIT_REQUEST_APPROVED = 'EDIT_REQUEST_APPROVED',
  EDIT_REQUEST_REJECTED = 'EDIT_REQUEST_REJECTED',
  EDIT_PERMISSION_EXPIRING = 'EDIT_PERMISSION_EXPIRING',
  EDIT_PERMISSION_EXPIRED = 'EDIT_PERMISSION_EXPIRED',
}

export interface OrderEditRequest {
  id: string;
  orderId: string;
  status: EditRequestStatus;
  observations: string | null;
  requestedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  reviewedAt?: string;
  reviewNotes?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status?: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEditRequestDto {
  observations: string;
}

export interface ReviewEditRequestDto {
  reviewNotes?: string;
}
