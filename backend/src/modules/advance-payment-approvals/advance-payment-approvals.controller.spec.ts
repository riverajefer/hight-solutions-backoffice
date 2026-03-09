import { Test, TestingModule } from '@nestjs/testing';
import { AdvancePaymentApprovalsController } from './advance-payment-approvals.controller';
import { AdvancePaymentApprovalsService } from './advance-payment-approvals.service';
import { PrismaService } from '../../database/prisma.service';

describe('AdvancePaymentApprovalsController', () => {
  let controller: AdvancePaymentApprovalsController;
  let service: jest.Mocked<AdvancePaymentApprovalsService>;

  beforeEach(async () => {
    service = {
      findPendingRequests: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvancePaymentApprovalsController],
      providers: [
        { provide: AdvancePaymentApprovalsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdvancePaymentApprovalsController>(AdvancePaymentApprovalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPending', () => {
    it('should return pending requests', async () => {
      const result = [{ id: '1' }];
      service.findPendingRequests.mockResolvedValue(result as any);

      expect(await controller.findPending()).toBe(result);
      expect(service.findPendingRequests).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all requests', async () => {
      const result = [{ id: '1' }];
      service.findAll.mockResolvedValue(result as any);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findMy', () => {
    it('should return user requests', async () => {
      const result = [{ id: '1' }];
      service.findByUser.mockResolvedValue(result as any);

      expect(await controller.findMy('user1')).toBe(result);
      expect(service.findByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('approve', () => {
    it('should approve request', async () => {
      const result = { id: '1', status: 'APPROVED' };
      const dto = { reviewNotes: 'OK' };
      service.approve.mockResolvedValue(result as any);

      expect(await controller.approve('1', 'reviewer1', dto)).toBe(result);
      expect(service.approve).toHaveBeenCalledWith('1', 'reviewer1', dto);
    });
  });

  describe('reject', () => {
    it('should reject request', async () => {
      const result = { id: '1', status: 'REJECTED' };
      const dto = { reviewNotes: 'No' };
      service.reject.mockResolvedValue(result as any);

      expect(await controller.reject('1', 'reviewer1', dto)).toBe(result);
      expect(service.reject).toHaveBeenCalledWith('1', 'reviewer1', dto);
    });
  });
});
