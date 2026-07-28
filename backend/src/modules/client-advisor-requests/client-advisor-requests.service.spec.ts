import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientAdvisorRequestsService } from './client-advisor-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

describe('ClientAdvisorRequestsService', () => {
  let service: ClientAdvisorRequestsService;
  let prisma: MockPrismaService;
  let notifications: {
    create: jest.Mock;
    notifyUsersWithPermission: jest.Mock;
  };
  let whatsapp: { sendApprovalNotification: jest.Mock };
  let registry: { register: jest.Mock };

  const CLIENT = { id: 'client-1', name: 'Cliente ABC' };
  const REQUESTER = {
    id: 'requester-1',
    firstName: 'Ana',
    lastName: 'Ruiz',
    email: 'ana@x.com',
  };
  const ADVISOR = {
    id: 'advisor-1',
    isActive: true,
    firstName: 'Beto',
    lastName: 'Paz',
    email: 'beto@x.com',
  };
  const REVIEWER_WITH_PERM = {
    id: 'admin-1',
    role: { permissions: [{ permission: { name: 'approve_client_advisor' } }] },
  };
  const REVIEWER_NO_PERM = {
    id: 'user-9',
    role: { permissions: [{ permission: { name: 'read_clients' } }] },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = {
      create: jest.fn(),
      notifyUsersWithPermission: jest.fn(),
    };
    whatsapp = {
      sendApprovalNotification: jest.fn().mockResolvedValue(undefined),
    };
    registry = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAdvisorRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: WhatsappService, useValue: whatsapp },
        { provide: ApprovalRequestRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(ClientAdvisorRequestsService);
    // tx === prisma so tx.model.method is controllable via the same mock
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
  });

  it('registers its handler on module init', () => {
    service.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(
      'CLIENT_ADVISOR_ASSIGNMENT',
      service,
    );
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.client.findUnique.mockResolvedValue(CLIENT);
      prisma.user.findUnique.mockResolvedValue(ADVISOR); // requestedAdvisor lookup
      prisma.clientAdvisor.findUnique.mockResolvedValue(null); // not already assigned
      prisma.clientAdvisorRequest.findFirst.mockResolvedValue(null); // no pending dup
      prisma.clientAdvisorRequest.create.mockResolvedValue({
        id: 'req-1',
        client: CLIENT,
        requestedBy: REQUESTER,
        requestedAdvisor: ADVISOR,
      });
    });

    it('creates a pending request and notifies reviewers', async () => {
      const result = await service.create('requester-1', {
        clientId: 'client-1',
        requestedAdvisorId: 'advisor-1',
        reason: 'Especialista en DTF',
      });

      expect(prisma.clientAdvisorRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: 'client-1',
            requestedById: 'requester-1',
            requestedAdvisorId: 'advisor-1',
            status: 'PENDING',
          }),
        }),
      );
      expect(notifications.notifyUsersWithPermission).toHaveBeenCalledWith(
        'approve_client_advisor',
        expect.objectContaining({ type: 'CLIENT_ADVISOR_REQUEST_PENDING' }),
      );
      expect(result).toHaveProperty('id', 'req-1');
    });

    it('throws if client does not exist', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.create('requester-1', {
          clientId: 'nope',
          requestedAdvisorId: 'advisor-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if advisor is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...ADVISOR, isActive: false });
      await expect(
        service.create('requester-1', {
          clientId: 'client-1',
          requestedAdvisorId: 'advisor-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if advisor already assigned to the client', async () => {
      prisma.clientAdvisor.findUnique.mockResolvedValue({ id: 'ca-1' });
      await expect(
        service.create('requester-1', {
          clientId: 'client-1',
          requestedAdvisorId: 'advisor-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if a pending request already exists', async () => {
      prisma.clientAdvisorRequest.findFirst.mockResolvedValue({ id: 'req-x' });
      await expect(
        service.create('requester-1', {
          clientId: 'client-1',
          requestedAdvisorId: 'advisor-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      prisma.user.findUnique
        .mockResolvedValueOnce(REVIEWER_WITH_PERM) // validateReviewerPermission
        .mockResolvedValueOnce({ isActive: true }); // advisor still active
      prisma.clientAdvisorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        clientId: 'client-1',
        requestedById: 'requester-1',
        requestedAdvisorId: 'advisor-1',
        client: CLIENT,
        requestedAdvisor: ADVISOR,
        status: 'PENDING',
      });
      prisma.clientAdvisor.createMany.mockResolvedValue({ count: 1 });
      prisma.clientAdvisorRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      });
    });

    it('creates the ClientAdvisor row and marks APPROVED', async () => {
      const result = await service.approve('req-1', 'admin-1', {});

      expect(prisma.clientAdvisor.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ clientId: 'client-1', advisorId: 'advisor-1' }],
          skipDuplicates: true,
        }),
      );
      expect(prisma.clientAdvisorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CLIENT_ADVISOR_REQUEST_APPROVED' }),
      );
      expect(result).toHaveProperty('status', 'APPROVED');
    });

    it('throws Forbidden if reviewer lacks permission', async () => {
      prisma.user.findUnique.mockReset();
      prisma.user.findUnique.mockResolvedValue(REVIEWER_NO_PERM);
      await expect(service.approve('req-1', 'user-9', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFound if request missing or already processed', async () => {
      prisma.clientAdvisorRequest.findFirst.mockResolvedValue(null);
      await expect(service.approve('req-1', 'admin-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(REVIEWER_WITH_PERM);
      prisma.clientAdvisorRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        clientId: 'client-1',
        requestedById: 'requester-1',
        client: CLIENT,
        requestedAdvisor: ADVISOR,
        status: 'PENDING',
      });
      prisma.clientAdvisorRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
      });
    });

    it('marks REJECTED and notifies the requester', async () => {
      const result = await service.reject('req-1', 'admin-1', {
        reviewNotes: 'No corresponde',
      });

      expect(prisma.clientAdvisorRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            reviewNotes: 'No corresponde',
          }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CLIENT_ADVISOR_REQUEST_REJECTED' }),
      );
      expect(result).toHaveProperty('status', 'REJECTED');
    });
  });
});
