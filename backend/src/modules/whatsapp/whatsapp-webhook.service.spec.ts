import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from './whatsapp.service';
import { ApprovalRequestRegistry, ApprovalRequestHandler } from './approval-request-registry';
import { Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('WhatsappWebhookService', () => {
  let service: WhatsappWebhookService;
  let configService: jest.Mocked<ConfigService>;
  let prisma: any; 
  let notificationsService: jest.Mocked<NotificationsService>;
  let whatsappService: jest.Mocked<WhatsappService>;
  let approvalRegistry: jest.Mocked<ApprovalRequestRegistry>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'whatsapp.appSecret') return 'test_secret';
        if (key === 'whatsapp.actionSecret') return 'action_secret';
        if (key === 'app.frontendUrl') return 'http://localhost:3000';
        return null;
      }),
    };

    const mockPrisma = {
      user: {
        findFirst: jest.fn(),
      },
      orderEditRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      whatsappActionContext: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      productionOrder: {
        update: jest.fn(),
      },
    };

    const mockNotificationsService = {
      create: jest.fn(),
      createAppSystemNotification: jest.fn(),
    };

    const mockWhatsappService = {
      sendTemplateMessage: jest.fn(),
      sendTextMessage: jest.fn(),
      validateActionHmac: jest.fn(),
    };

    const mockApprovalRegistry = {
      hasHandler: jest.fn(),
      getHandler: jest.fn(),
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappWebhookService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: ApprovalRequestRegistry, useValue: mockApprovalRegistry },
      ],
    }).compile();

    service = module.get<WhatsappWebhookService>(WhatsappWebhookService);
    configService = module.get(ConfigService) as any;
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService) as any;
    whatsappService = module.get(WhatsappService) as any;
    approvalRegistry = module.get(ApprovalRequestRegistry) as any;

    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
    // jest.spyOn
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyMetaSignature', () => {
    it('should pass with valid signature', () => {
      const rawBody = Buffer.from('test payload');
      const hmac = crypto.createHmac('sha256', 'test_secret');
      hmac.update(rawBody);
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      expect(() => service.verifyMetaSignature(rawBody, expectedSignature)).not.toThrow();
    });

    it('should throw UnauthorizedException if signatures do not match', () => {
      const rawBody = Buffer.from('test payload');
      expect(() => service.verifyMetaSignature(rawBody, 'sha256=invalid')).toThrow(UnauthorizedException);
    });

    it('should check DEV mode signature bypass', () => {
      const rawBody = Buffer.from('test');
      expect(() => service.verifyMetaSignature(rawBody, '')).toThrow(UnauthorizedException);
    });
  });

  describe('processWebhook', () => {
    it('should not process if there are no entries', async () => {
      await service.processWebhook({});
      // Should not throw, just returns void
    });

    it('should handle view action properly', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue({ id: '123', order: { id: 'o_123', orderNumber: '1234' } });
      const body = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '57300000000',
                      type: 'interactive',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'view:123',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processWebhook(body);
      expect(prisma.orderEditRequest.findFirst).toHaveBeenCalledWith({
        where: { id: '123' },
        include: { order: { select: { id: true, orderNumber: true } } },
      });
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith('57300000000', expect.stringContaining('http://localhost:3000'));
    });

    it('should handle interactive approve with valid hmac', async () => {
      // Return true to pass hmac validation
      whatsappService.validateActionHmac.mockReturnValue(true);
      
      // Setup mock data - handleButtonReply queries orderEditRequest directly (no registry)
      const mockRequest = {
        id: '123',
        status: 'PENDING',
        requestedById: 'uid1',
        orderId: 'o1',
        order: { id: 'o1', orderNumber: 'OP-001' },
        requestedBy: { id: 'uid1', email: 'u@e.com', firstName: 'U', lastName: 'L' },
      };
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.orderEditRequest.update.mockResolvedValue(mockRequest);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', name: 'Admin', role: { name: 'admin' } });

      const body = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '57300000000',
                      type: 'interactive',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'approve:123:validhmac',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processWebhook(body);
      
      expect(whatsappService.validateActionHmac).toHaveBeenCalledWith('approve', '123', '57300000000', 'validhmac');
      expect(prisma.orderEditRequest.findFirst).toHaveBeenCalled();
      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(prisma.orderEditRequest.update).toHaveBeenCalled();
    });

    it('should handle template button reply APPROVE', async () => {
      // Mocking whatsappActionContext with all required fields
      const mockCtx = {
        id: 'store1',
        requestType: 'EXPENSE_ORDER_AUTH',
        entityId: 'req_123',
        requestId: 'req_123',
        status: 'DELIVERED',
        messageId: 'wamid.123',
        adminPhone: '57300000000',
        expiresAt: new Date(Date.now() + 86400000),
      };
      
      prisma.whatsappActionContext.findUnique.mockResolvedValue(mockCtx);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', name: 'Admin', role: { name: 'admin' } });

      // Mock Handler for generic approval path
      const mockHandler: ApprovalRequestHandler = {
        findPendingRequest: jest.fn().mockResolvedValue({ status: 'PENDING', displayLabel: 'Test', requestedById: 'u1' }),
        approveViaWhatsApp: jest.fn().mockResolvedValue(undefined),
        rejectViaWhatsApp: jest.fn().mockResolvedValue(undefined),
      };
      approvalRegistry.getHandler.mockReturnValue(mockHandler);

      const body = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '57300000000',
                      type: 'button',
                      context: { id: 'wamid.123' },
                      button: { payload: 'APPROVE', text: 'Autorizar' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processWebhook(body);

      expect(prisma.whatsappActionContext.findUnique).toHaveBeenCalledWith({ where: { messageId: 'wamid.123' }});
      expect(mockHandler.findPendingRequest).toHaveBeenCalledWith('req_123');
      expect(mockHandler.approveViaWhatsApp).toHaveBeenCalledWith('req_123', expect.any(String));
    });
  });
});
