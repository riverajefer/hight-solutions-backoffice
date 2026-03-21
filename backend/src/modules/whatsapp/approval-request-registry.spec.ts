import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalRequestRegistry, ApprovalRequestHandler } from './approval-request-registry';
import { Logger } from '@nestjs/common';

describe('ApprovalRequestRegistry', () => {
  let registry: ApprovalRequestRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApprovalRequestRegistry],
    }).compile();

    registry = module.get<ApprovalRequestRegistry>(ApprovalRequestRegistry);
    
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  it('should register and return a handler', () => {
    const mockHandler: ApprovalRequestHandler = {
      findPendingRequest: jest.fn(),
      approveViaWhatsApp: jest.fn(),
      rejectViaWhatsApp: jest.fn(),
    };

    registry.register('TYPE_1', mockHandler);

    expect(registry.hasHandler('TYPE_1')).toBe(true);
    expect(registry.getHandler('TYPE_1')).toBe(mockHandler);
  });

  it('should return undefined for unregistered handler', () => {
    expect(registry.hasHandler('TYPE_2')).toBe(false);
    expect(registry.getHandler('TYPE_2')).toBeUndefined();
  });
});
