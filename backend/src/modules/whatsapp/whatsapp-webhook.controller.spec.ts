import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, Logger } from '@nestjs/common';

describe('WhatsappWebhookController', () => {
  let controller: WhatsappWebhookController;
  let webhookService: jest.Mocked<WhatsappWebhookService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockWebhookService = {
      verifyMetaSignature: jest.fn(),
      processWebhook: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappWebhookController],
      providers: [
        { provide: WhatsappWebhookService, useValue: mockWebhookService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<WhatsappWebhookController>(WhatsappWebhookController);
    webhookService = module.get(WhatsappWebhookService) as any;
    configService = module.get(ConfigService) as any;

    // Suppress logger to keep test output clean
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should return challenge if token matches', () => {
      configService.get.mockReturnValue('my-secret-token');
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my-secret-token',
        'hub.challenge': '12345',
      };

      const result = controller.verifyWebhook(query);
      expect(result).toBe('12345');
    });

    it('should throw ForbiddenException if token unmatches', () => {
      configService.get.mockReturnValue('my-secret-token');
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '12345',
      };

      expect(() => controller.verifyWebhook(query)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if mode is missing', () => {
      configService.get.mockReturnValue('my-secret-token');
      const query = {
        'hub.verify_token': 'my-secret-token',
        'hub.challenge': '12345',
      };

      expect(() => controller.verifyWebhook(query)).toThrow(ForbiddenException);
    });
  });

  describe('handleWebhook', () => {
    it('should handle payload properly', async () => {
      const rawBody = Buffer.from('test');
      const signature = 'sha256=abcdef';
      const body = { entry: [{ changes: [{ value: { messages: [] } }] }] };

      const result = await controller.handleWebhook(body, rawBody, signature);

      expect(webhookService.verifyMetaSignature).toHaveBeenCalledWith(rawBody, signature);
      expect(webhookService.processWebhook).toHaveBeenCalledWith(body);
      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle processWebhook failure asynchronously without affecting response', async () => {
      const rawBody = Buffer.from('test');
      const signature = 'sha256=abcdef';
      const body = {};

      webhookService.processWebhook.mockRejectedValueOnce(new Error('Async error'));

      const result = await controller.handleWebhook(body, rawBody, signature);

      expect(webhookService.verifyMetaSignature).toHaveBeenCalledWith(rawBody, signature);
      expect(webhookService.processWebhook).toHaveBeenCalledWith(body);
      expect(result).toEqual({ status: 'ok' });
    });
  });
});
