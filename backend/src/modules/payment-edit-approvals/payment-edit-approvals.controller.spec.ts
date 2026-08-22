import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEditApprovalsController } from './payment-edit-approvals.controller';
import { PaymentEditApprovalsService } from './payment-edit-approvals.service';
import { PrismaService } from '../../database/prisma.service';

describe('PaymentEditApprovalsController', () => {
  let controller: PaymentEditApprovalsController;
  let service: jest.Mocked<PaymentEditApprovalsService>;

  beforeEach(async () => {
    service = {
      findPendingRequests: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByOrder: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentEditApprovalsController],
      providers: [
        { provide: PaymentEditApprovalsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PaymentEditApprovalsController>(PaymentEditApprovalsController);
  });

  it('findPending delega', async () => {
    service.findPendingRequests.mockResolvedValue([] as any);
    await controller.findPending();
    expect(service.findPendingRequests).toHaveBeenCalled();
  });

  it('findAll delega', async () => {
    service.findAll.mockResolvedValue([] as any);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findMy delega el userId', async () => {
    service.findByUser.mockResolvedValue([] as any);
    await controller.findMy('u1');
    expect(service.findByUser).toHaveBeenCalledWith('u1');
  });

  it('findByOrder delega el orderId', async () => {
    service.findByOrder.mockResolvedValue([] as any);
    await controller.findByOrder('o1');
    expect(service.findByOrder).toHaveBeenCalledWith('o1');
  });

  it('approve delega id, reviewerId y dto', async () => {
    const dto = { reviewNotes: 'ok' } as any;
    service.approve.mockResolvedValue({ id: 'req1' } as any);
    await controller.approve('req1', 'rev1', dto);
    expect(service.approve).toHaveBeenCalledWith('req1', 'rev1', dto);
  });

  it('reject delega id, reviewerId y dto', async () => {
    const dto = { reviewNotes: 'no' } as any;
    service.reject.mockResolvedValue({ id: 'req1' } as any);
    await controller.reject('req1', 'rev1', dto);
    expect(service.reject).toHaveBeenCalledWith('req1', 'rev1', dto);
  });
});
