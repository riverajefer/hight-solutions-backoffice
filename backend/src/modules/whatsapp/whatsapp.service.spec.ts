import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { Logger } from '@nestjs/common';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let configService: ConfigService;

  const mockConfig: Record<string, string> = {
    'whatsapp.accessToken': 'test-token',
    'whatsapp.phoneNumberId': 'test-phone-id',
    'whatsapp.apiVersion': 'v22.0',
    'app.frontendUrl': 'http://test.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock global fetch
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should initialize with config values', () => {
      expect(service['accessToken']).toBe('test-token');
      expect(service['phoneNumberId']).toBe('test-phone-id');
      expect(service['baseUrl']).toContain('v22.0/test-phone-id/messages');
      expect(service['isConfigured']).toBe(true);
    });

    it('should set isConfigured to false if credentials are missing', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<WhatsappService>(WhatsappService);
      expect(unconfiguredService['isConfigured']).toBe(false);
    });

    it('should use default apiVersion and frontendUrl if not provided', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            WhatsappService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                    if (key === 'whatsapp.accessToken') return 'token';
                    if (key === 'whatsapp.phoneNumberId') return 'phone';
                    return undefined;
                }),
              },
            },
          ],
        }).compile();
  
        const defaultService = module.get<WhatsappService>(WhatsappService);
        expect(defaultService['baseUrl']).toContain('v22.0/phone/messages');
        expect(defaultService['frontendUrl']).toBe('http://localhost:5173');
      });
  });

  describe('normalizePhone', () => {
    it('should remove non-digits and leading +', () => {
      expect(service['normalizePhone']('+57 311 832 2699')).toBe('573118322699');
    });

    it('should add 57 prefix to 10-digit Colombian numbers starting with 3', () => {
      expect(service['normalizePhone']('3118322699')).toBe('573118322699');
    });

    it('should not add prefix if it is already 12 digits', () => {
      expect(service['normalizePhone']('573118322699')).toBe('573118322699');
    });
  });

  describe('sendTemplateMessage', () => {
    const to = '3118322699';
    const template = 'test_template';
    const params = ['param1', 'param2'];

    it('should return null if not configured', async () => {
      (service as any).isConfigured = false;
      const result = await service.sendTemplateMessage(to, template, params);
      expect(result).toBeNull();
    });

    it('should send a successful template message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          messages: [{ id: 'wa-msg-id-123' }],
        }),
      });

      const result = await service.sendTemplateMessage(to, template, params);

      expect(result).toBe('wa-msg-id-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );

      const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchArgs[1].body);
      expect(body.to).toBe('573118322699');
      expect(body.template.name).toBe(template);
    });

    it('should handle button parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          messages: [{ id: 'wa-msg-id-456' }],
        }),
      });

      const buttonParams = [{ index: 0, text: 'order-123' }];
      await service.sendTemplateMessage(to, template, params, 'es_CO', buttonParams);

      const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchArgs[1].body);
      const buttons = body.template.components.filter((c: any) => c.type === 'button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].index).toBe('0');
      expect(buttons[0].parameters[0].text).toBe('order-123');
    });

    it('should return null and log error when response is not ok (with data.error.message)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          error: { message: 'Some WhatsApp API error' },
        }),
      });

      const loggerSpy = jest.spyOn(service['logger'], 'error');
      const result = await service.sendTemplateMessage(to, template, params);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Some WhatsApp API error'));
    });

    it('should return null and log error when response is not ok (without data.error.message)', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Forbidden',
          json: jest.fn().mockResolvedValue({}),
        });
  
        const loggerSpy = jest.spyOn(service['logger'], 'error');
        const result = await service.sendTemplateMessage(to, template, params);
  
        expect(result).toBeNull();
        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Forbidden'));
      });

    it('should handle missing message ID in successful response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });
  
        const result = await service.sendTemplateMessage(to, template, params);
        expect(result).toBeNull();
      });

    it('should return null and log error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      const loggerSpy = jest.spyOn(service['logger'], 'error');
      const result = await service.sendTemplateMessage(to, template, params);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Network failure'));
    });
  });

  describe('notificarSolicitudEdicionOP', () => {
    it('should call sendTemplateMessage with correct arguments', async () => {
      const sendSpy = jest.spyOn(service, 'sendTemplateMessage').mockResolvedValue('msg-id');
      
      const result = await service.notificarSolicitudEdicionOP(
        '3118322699',
        'Juan',
        'Vendedor',
        'OP-100',
        'Falta descuento',
        'ord_123'
      );

      expect(result).toBe('msg-id');
      expect(sendSpy).toHaveBeenCalledWith(
        '3118322699',
        'solicitud_edicion_op',
        ['Juan', 'Vendedor', 'OP-100', 'Falta descuento'],
        'es_CO',
        [{ index: 0, text: 'ord_123' }]
      );
    });
  });
});
