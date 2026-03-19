import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ExpenseOrderAuthRequestsService } from './expense-order-auth-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

describe('ExpenseOrderAuthRequestsService', () => {
  let service: ExpenseOrderAuthRequestsService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    expenseOrder: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    expenseOrderAuthRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyAllAdmins: jest.fn(),
    create: jest.fn(),
  };

  const USER_ID = 'user-123';
  const ADMIN_ID = 'admin-456';
  const OG_ID = 'og-789';
  const REQUEST_ID = 'req-101';

  const mockUser = {
    id: USER_ID,
    email: 'user@example.com',
    firstName: 'User',
    lastName: 'Test',
    role: { name: 'user' },
  };

  const mockAdmin = {
    id: ADMIN_ID,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'Test',
    role: { name: 'admin' },
  };

  const mockExpenseOrder = {
    id: OG_ID,
    ogNumber: 'OG-001',
    status: 'PENDING',
  };

  const mockRequest = {
    id: REQUEST_ID,
    expenseOrderId: OG_ID,
    requestedById: USER_ID,
    reason: 'Test reason',
    status: EditRequestStatus.PENDING,
    requestedBy: {
      id: USER_ID,
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Test',
    },
    expenseOrder: {
      id: OG_ID,
      ogNumber: 'OG-001',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseOrderAuthRequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApprovalRequestRegistry, useValue: { register: jest.fn() } },
        { provide: WhatsappService, useValue: { sendApprovalNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<ExpenseOrderAuthRequestsService>(ExpenseOrderAuthRequestsService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      expenseOrderId: OG_ID,
      reason: 'Need authorization',
    };

    it('should create a request successfully', async () => {
      mockPrismaService.expenseOrder.findUnique.mockResolvedValue(mockExpenseOrder);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.expenseOrderAuthRequest.create.mockResolvedValue(mockRequest);

      const result = await service.create(USER_ID, createDto);

      expect(result).toEqual(mockRequest);
      expect(notificationsService.notifyAllAdmins).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_PENDING,
      }));
    });

    it('should throw NotFoundException if OG doesn\'t exist', async () => {
      mockPrismaService.expenseOrder.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is admin', async () => {
      mockPrismaService.expenseOrder.findUnique.mockResolvedValue(mockExpenseOrder);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.create(ADMIN_ID, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if a pending request already exists', async () => {
      mockPrismaService.expenseOrder.findUnique.mockResolvedValue(mockExpenseOrder);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);

      await expect(service.create(USER_ID, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    const approveDto = { reviewNotes: 'Approved' };

    it('should approve a request successfully', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.expenseOrderAuthRequest.update.mockResolvedValue({
        ...mockRequest,
        status: EditRequestStatus.APPROVED,
        reviewedById: ADMIN_ID,
      });

      const result = await service.approve(REQUEST_ID, ADMIN_ID, approveDto);

      expect(result.status).toBe(EditRequestStatus.APPROVED);
      expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_APPROVED,
      }));
    });

    it('should throw NotFoundException if request is not found or not pending', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(null);

      await expect(service.approve(REQUEST_ID, ADMIN_ID, approveDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if reviewer is not admin', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.approve(REQUEST_ID, USER_ID, approveDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    const rejectDto = { reviewNotes: 'Rejected' };

    it('should reject a request successfully', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.expenseOrderAuthRequest.update.mockResolvedValue({
        ...mockRequest,
        status: EditRequestStatus.REJECTED,
        reviewedById: ADMIN_ID,
      });

      const result = await service.reject(REQUEST_ID, ADMIN_ID, rejectDto);

      expect(result.status).toBe(EditRequestStatus.REJECTED);
      expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_REJECTED,
      }));
    });

    it('should throw ForbiddenException if reviewer is not admin', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.reject(REQUEST_ID, USER_ID, rejectDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(null);
      await expect(service.reject(REQUEST_ID, ADMIN_ID, rejectDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('requiresAuthorization', () => {
    it('should return false for admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      const result = await service.requiresAuthorization(ADMIN_ID);
      expect(result.required).toBe(false);
    });

    it('should return true for non-admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.requiresAuthorization(USER_ID);
      expect(result.required).toBe(true);
    });

    it('should return true even if user not found (default to secure)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const result = await service.requiresAuthorization('non-existent');
      expect(result.required).toBe(true);
    });
  });

  describe('getApprovedRequest', () => {
    it('should return an approved request if it exists', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(mockRequest);
      const result = await service.getApprovedRequest(OG_ID, USER_ID);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('consumeApprovedRequest', () => {
    it('should be a no-op', async () => {
      await expect(service.consumeApprovedRequest(OG_ID, USER_ID)).resolves.toBeUndefined();
    });
  });

  describe('hasApprovedRequest', () => {
    it('should return true if approved request exists', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue({ id: 'some-id' });
      const result = await service.hasApprovedRequest(OG_ID, USER_ID);
      expect(result).toBe(true);
    });

    it('should return false if no approved request exists', async () => {
      mockPrismaService.expenseOrderAuthRequest.findFirst.mockResolvedValue(null);
      const result = await service.hasApprovedRequest(OG_ID, USER_ID);
      expect(result).toBe(false);
    });
  });

  describe('Queries', () => {
    it('findPendingRequests should call prisma.findMany with pending status', async () => {
      mockPrismaService.expenseOrderAuthRequest.findMany.mockResolvedValue([mockRequest]);
      await service.findPendingRequests();
      expect(mockPrismaService.expenseOrderAuthRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: EditRequestStatus.PENDING } })
      );
    });

    it('findAll should call prisma.findMany', async () => {
      mockPrismaService.expenseOrderAuthRequest.findMany.mockResolvedValue([mockRequest]);
      await service.findAll();
      expect(mockPrismaService.expenseOrderAuthRequest.findMany).toHaveBeenCalled();
    });

    it('findByUser should call prisma.findMany with userId', async () => {
      mockPrismaService.expenseOrderAuthRequest.findMany.mockResolvedValue([mockRequest]);
      await service.findByUser(USER_ID);
      expect(mockPrismaService.expenseOrderAuthRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { requestedById: USER_ID } })
      );
    });
  });
});
