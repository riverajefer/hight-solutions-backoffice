import { Test, TestingModule } from '@nestjs/testing';
import { DiscountApprovalsController } from './discount-approvals.controller';
import { DiscountApprovalsService } from './discount-approvals.service';
import { PrismaService } from '../../database/prisma.service';

describe('DiscountApprovalsController', () => {
  let controller: DiscountApprovalsController;
  let service: jest.Mocked<DiscountApprovalsService>;

  const mockService = {
    findPendingRequests: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountApprovalsController],
      providers: [
        { provide: DiscountApprovalsService, useValue: mockService },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<DiscountApprovalsController>(DiscountApprovalsController);
    service = module.get(DiscountApprovalsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findPending delegates to service.findPendingRequests', async () => {
    mockService.findPendingRequests.mockResolvedValueOnce([]);
    const res = await controller.findPending();
    expect(service.findPendingRequests).toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  it('findAll delegates to service.findAll', async () => {
    mockService.findAll.mockResolvedValueOnce([]);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  it('findMy delegates to service.findByUser with user id', async () => {
    mockService.findByUser.mockResolvedValueOnce([]);
    const res = await controller.findMy('user-1');
    expect(service.findByUser).toHaveBeenCalledWith('user-1');
    expect(res).toEqual([]);
  });

  it('findOne delegates to service.findOne', async () => {
    mockService.findOne.mockResolvedValueOnce({ id: 'req-1' });
    const res = await controller.findOne('req-1');
    expect(service.findOne).toHaveBeenCalledWith('req-1');
    expect(res).toEqual({ id: 'req-1' });
  });

  it('approve delegates to service.approve with reviewer id and dto', async () => {
    const dto = { reviewNotes: 'OK' };
    mockService.approve.mockResolvedValueOnce({ id: 'req-1', status: 'APPROVED' });
    const res = await controller.approve('req-1', 'reviewer-1', dto);
    expect(service.approve).toHaveBeenCalledWith('req-1', 'reviewer-1', dto);
    expect(res).toEqual({ id: 'req-1', status: 'APPROVED' });
  });

  it('reject delegates to service.reject with reviewer id and dto', async () => {
    const dto = { reviewNotes: 'Not valid' };
    mockService.reject.mockResolvedValueOnce({ id: 'req-1', status: 'REJECTED' });
    const res = await controller.reject('req-1', 'reviewer-1', dto);
    expect(service.reject).toHaveBeenCalledWith('req-1', 'reviewer-1', dto);
    expect(res).toEqual({ id: 'req-1', status: 'REJECTED' });
  });
});
