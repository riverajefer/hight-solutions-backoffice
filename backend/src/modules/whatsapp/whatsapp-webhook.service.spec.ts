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

    it('should ignore unknown message types', async () => {
      const body = {
        entry: [{ changes: [{ value: { messages: [{ from: '57300', type: 'text', text: { body: 'hola' } }] } }] }],
      };
      await service.processWebhook(body);
      expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should catch and log errors without rethrowing', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
      const body = {
        entry: [{ changes: [{ value: { messages: [{ from: '57300', type: 'button', button: { payload: 'APPROVE' }, context: { id: 'wamid.x' } }] } }] }],
      };
      prisma.whatsappActionContext.findUnique.mockRejectedValue(new Error('DB down'));
      await expect(service.processWebhook(body)).resolves.toBeUndefined();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('DB down'), expect.anything());
    });
  });

  describe('handleTemplateButtonReply (via processWebhook)', () => {
    const buildButtonBody = (payload: string, contextId: string, from = '57300000000') => ({
      entry: [{ changes: [{ value: { messages: [{ from, type: 'button', button: { payload }, context: { id: contextId } }] } }] }],
    });

    it('should return early if payload is missing', async () => {
      await service.processWebhook(buildButtonBody('', 'wamid.1'));
      expect(prisma.whatsappActionContext.findUnique).not.toHaveBeenCalled();
    });

    it('should return early if contextMessageId is missing', async () => {
      const body = {
        entry: [{ changes: [{ value: { messages: [{ from: '57300', type: 'button', button: { payload: 'APPROVE' }, context: {} }] } }] }],
      };
      await service.processWebhook(body);
      expect(prisma.whatsappActionContext.findUnique).not.toHaveBeenCalled();
    });

    it('should ignore unknown payload values', async () => {
      await service.processWebhook(buildButtonBody('UNKNOWN', 'wamid.1'));
      expect(prisma.whatsappActionContext.findUnique).not.toHaveBeenCalled();
    });

    it('should accept Spanish button text "Autorizar"', async () => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue({
        requestId: 'r1', messageId: 'wamid.1', adminPhone: '57300000000',
        requestType: 'ORDER_EDIT', expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildButtonBody('Autorizar', 'wamid.1'));
      expect(prisma.whatsappActionContext.findUnique).toHaveBeenCalled();
    });

    it('should accept Spanish button text "Rechazar"', async () => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue({
        requestId: 'r1', messageId: 'wamid.1', adminPhone: '57300000000',
        requestType: 'ORDER_EDIT', expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildButtonBody('Rechazar', 'wamid.1'));
      expect(prisma.whatsappActionContext.findUnique).toHaveBeenCalled();
    });

    it('should send warning when no action context found', async () => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue(null);
      await service.processWebhook(buildButtonBody('APPROVE', 'wamid.1'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('No se encontró el contexto'),
      );
    });

    it('should send warning when action context is expired', async () => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue({
        requestId: 'r1', messageId: 'wamid.1', adminPhone: '57300000000',
        requestType: 'ORDER_EDIT', expiresAt: new Date(Date.now() - 86400000),
      });
      await service.processWebhook(buildButtonBody('APPROVE', 'wamid.1'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('expirado'),
      );
    });

    it('should send warning when phone does not match admin', async () => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue({
        requestId: 'r1', messageId: 'wamid.1', adminPhone: '57399999999',
        requestType: 'ORDER_EDIT', expiresAt: new Date(Date.now() + 86400000),
      });
      await service.processWebhook(buildButtonBody('APPROVE', 'wamid.1', '57300000000'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('No tienes permisos'),
      );
    });
  });

  describe('handleOrderEditApproval (via processWebhook)', () => {
    const buildApproveBody = (payload = 'APPROVE') => ({
      entry: [{ changes: [{ value: { messages: [{ from: '57300000000', type: 'button', button: { payload }, context: { id: 'wamid.1' } }] } }] }],
    });

    const validCtx = {
      requestId: 'req1', messageId: 'wamid.1', adminPhone: '57300000000',
      requestType: 'ORDER_EDIT', expiresAt: new Date(Date.now() + 86400000),
    };

    const mockRequest = {
      id: 'req1', status: 'PENDING', requestedById: 'uid1', orderId: 'o1',
      order: { id: 'o1', orderNumber: 'OP-001' },
      requestedBy: { id: 'uid1', email: 'u@e.com', firstName: 'U', lastName: 'L' },
    };

    beforeEach(() => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue(validCtx);
      prisma.whatsappActionContext.delete.mockResolvedValue(undefined);
    });

    it('should send warning when order edit request not found', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildApproveBody());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Solicitud no encontrada'),
      );
    });

    it('should send info when request is already approved', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue({ ...mockRequest, status: 'APPROVED' });
      await service.processWebhook(buildApproveBody());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('aprobada'),
      );
    });

    it('should send info when request is already rejected', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue({ ...mockRequest, status: 'REJECTED' });
      await service.processWebhook(buildApproveBody());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('rechazada'),
      );
    });

    it('should send warning when no admin found by phone', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.user.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildApproveBody());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('No tienes permisos'),
      );
    });

    it('should approve order edit request successfully', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', role: { name: 'admin' } });
      prisma.orderEditRequest.update.mockResolvedValue(mockRequest);
      await service.processWebhook(buildApproveBody('APPROVE'));
      expect(prisma.orderEditRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin1' }),
      });
      expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'EDIT_REQUEST_APPROVED',
      }));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('autorizada'),
      );
    });

    it('should reject order edit request successfully', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', role: { name: 'admin' } });
      prisma.orderEditRequest.update.mockResolvedValue(mockRequest);
      await service.processWebhook(buildApproveBody('REJECT'));
      expect(prisma.orderEditRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({ status: 'REJECTED', reviewedById: 'admin1' }),
      });
      expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'EDIT_REQUEST_REJECTED',
      }));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('rechazada'),
      );
    });

    it('should clean up action context after approval', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', role: { name: 'admin' } });
      prisma.orderEditRequest.update.mockResolvedValue(mockRequest);
      await service.processWebhook(buildApproveBody());
      expect(prisma.whatsappActionContext.delete).toHaveBeenCalledWith({ where: { messageId: 'wamid.1' } });
    });
  });

  describe('handleGenericApproval (via processWebhook)', () => {
    const buildGenericButton = (payload = 'APPROVE') => ({
      entry: [{ changes: [{ value: { messages: [{ from: '57300000000', type: 'button', button: { payload }, context: { id: 'wamid.g1' } }] } }] }],
    });

    const genericCtx = {
      requestId: 'greq1', messageId: 'wamid.g1', adminPhone: '57300000000',
      requestType: 'EXPENSE_ORDER_AUTH', expiresAt: new Date(Date.now() + 86400000),
    };

    let mockHandler: ApprovalRequestHandler;

    beforeEach(() => {
      prisma.whatsappActionContext.findUnique.mockResolvedValue(genericCtx);
      prisma.whatsappActionContext.delete.mockResolvedValue(undefined);
      mockHandler = {
        findPendingRequest: jest.fn().mockResolvedValue({ status: 'PENDING', displayLabel: 'Gasto #100', requestedById: 'u2' }),
        approveViaWhatsApp: jest.fn().mockResolvedValue(undefined),
        rejectViaWhatsApp: jest.fn().mockResolvedValue(undefined),
      };
      approvalRegistry.getHandler.mockReturnValue(mockHandler);
    });

    it('should send warning when no handler registered for request type', async () => {
      approvalRegistry.getHandler.mockReturnValue(undefined as any);
      await service.processWebhook(buildGenericButton());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Tipo de solicitud no reconocido'),
      );
    });

    it('should send warning when pending request not found', async () => {
      (mockHandler.findPendingRequest as jest.Mock).mockResolvedValue(null);
      await service.processWebhook(buildGenericButton());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Solicitud no encontrada'),
      );
    });

    it('should send info when request already approved', async () => {
      (mockHandler.findPendingRequest as jest.Mock).mockResolvedValue({ status: 'APPROVED', displayLabel: 'Gasto #100' });
      await service.processWebhook(buildGenericButton());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('aprobada'),
      );
    });

    it('should send info when request already rejected', async () => {
      (mockHandler.findPendingRequest as jest.Mock).mockResolvedValue({ status: 'REJECTED', displayLabel: 'Gasto #100' });
      await service.processWebhook(buildGenericButton());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('rechazada'),
      );
    });

    it('should use handler.findReviewerByPhone when available', async () => {
      mockHandler.findReviewerByPhone = jest.fn().mockResolvedValue({ id: 'reviewer1' });
      await service.processWebhook(buildGenericButton());
      expect(mockHandler.findReviewerByPhone).toHaveBeenCalledWith('57300000000');
      expect(mockHandler.approveViaWhatsApp).toHaveBeenCalledWith('greq1', 'reviewer1');
    });

    it('should fallback to findAdminByPhone when handler has no findReviewerByPhone', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'admin2', role: { name: 'admin' } });
      await service.processWebhook(buildGenericButton());
      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(mockHandler.approveViaWhatsApp).toHaveBeenCalledWith('greq1', 'admin2');
    });

    it('should send warning when no reviewer found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildGenericButton());
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('No tienes permisos'),
      );
    });

    it('should reject via generic handler', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'admin2', role: { name: 'admin' } });
      await service.processWebhook(buildGenericButton('REJECT'));
      expect(mockHandler.rejectViaWhatsApp).toHaveBeenCalledWith('greq1', 'admin2');
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('rechazada'),
      );
    });

    it('should delete action context after generic approval', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'admin2', role: { name: 'admin' } });
      await service.processWebhook(buildGenericButton());
      expect(prisma.whatsappActionContext.delete).toHaveBeenCalledWith({ where: { messageId: 'wamid.g1' } });
    });
  });

  describe('handleButtonReply (interactive, via processWebhook)', () => {
    const buildInteractiveBody = (buttonId: string, from = '57300000000') => ({
      entry: [{ changes: [{ value: { messages: [{ from, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: buttonId } } }] } }] }],
    });

    it('should ignore unknown button actions', async () => {
      await service.processWebhook(buildInteractiveBody('something:abc'));
      expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should warn when button ID has no requestId', async () => {
      await service.processWebhook(buildInteractiveBody('approve'));
      expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should warn when approve/reject button has no HMAC', async () => {
      await service.processWebhook(buildInteractiveBody('approve:req1'));
      expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should send warning when HMAC is invalid', async () => {
      whatsappService.validateActionHmac.mockReturnValue(false);
      await service.processWebhook(buildInteractiveBody('approve:req1:badhmac'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Token inválido'),
      );
    });

    it('should send warning when request not found on approve', async () => {
      whatsappService.validateActionHmac.mockReturnValue(true);
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildInteractiveBody('approve:req1:validhmac'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Solicitud no encontrada'),
      );
    });

    it('should send info when request already processed on reject', async () => {
      whatsappService.validateActionHmac.mockReturnValue(true);
      prisma.orderEditRequest.findFirst.mockResolvedValue({
        id: 'req1', status: 'APPROVED', order: { id: 'o1', orderNumber: 'OP-001' },
        requestedBy: { id: 'uid1', email: 'u@e.com', firstName: 'U', lastName: 'L' },
      });
      await service.processWebhook(buildInteractiveBody('reject:req1:validhmac'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('aprobada'),
      );
    });

    it('should send warning when no admin found by phone', async () => {
      whatsappService.validateActionHmac.mockReturnValue(true);
      prisma.orderEditRequest.findFirst.mockResolvedValue({
        id: 'req1', status: 'PENDING', requestedById: 'uid1', orderId: 'o1',
        order: { id: 'o1', orderNumber: 'OP-001' },
        requestedBy: { id: 'uid1', email: 'u@e.com', firstName: 'U', lastName: 'L' },
      });
      prisma.user.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildInteractiveBody('approve:req1:validhmac'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('No tienes permisos'),
      );
    });

    it('should reject via interactive button successfully', async () => {
      whatsappService.validateActionHmac.mockReturnValue(true);
      prisma.orderEditRequest.findFirst.mockResolvedValue({
        id: 'req1', status: 'PENDING', requestedById: 'uid1', orderId: 'o1',
        order: { id: 'o1', orderNumber: 'OP-001' },
        requestedBy: { id: 'uid1', email: 'u@e.com', firstName: 'U', lastName: 'L' },
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'admin1', role: { name: 'admin' } });
      prisma.orderEditRequest.update.mockResolvedValue({});
      await service.processWebhook(buildInteractiveBody('reject:req1:validhmac'));
      expect(prisma.orderEditRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({ status: 'REJECTED' }),
      });
    });
  });

  describe('handleViewOrder (via processWebhook)', () => {
    const buildViewBody = (requestId: string) => ({
      entry: [{ changes: [{ value: { messages: [{ from: '57300000000', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: `view:${requestId}` } } }] } }] }],
    });

    it('should send warning when request not found', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);
      await service.processWebhook(buildViewBody('req404'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('Solicitud no encontrada'),
      );
    });

    it('should send order link when found', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue({
        id: 'req1', order: { id: 'o1', orderNumber: 'OP-005' },
      });
      await service.processWebhook(buildViewBody('req1'));
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('OP-005'),
      );
      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '57300000000', expect.stringContaining('http://localhost:3000/orders/o1'),
      );
    });
  });
});
