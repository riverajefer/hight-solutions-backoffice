import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementVoidRequestsGlobalController } from './cash-movement-void-requests-global.controller';
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { PrismaService } from '../../database/prisma.service';

describe('CashMovementVoidRequestsGlobalController', () => {
  let controller: CashMovementVoidRequestsGlobalController;
  let service: jest.Mocked<CashMovementVoidRequestsService>;

  beforeEach(async () => {
    service = {
      findAllPending: jest.fn(),
      findAll: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashMovementVoidRequestsGlobalController],
      providers: [
        { provide: CashMovementVoidRequestsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CashMovementVoidRequestsGlobalController>(
      CashMovementVoidRequestsGlobalController,
    );
  });

  it('findAllPending delega', async () => {
    service.findAllPending.mockResolvedValue([] as any);
    await controller.findAllPending();
    expect(service.findAllPending).toHaveBeenCalled();
  });

  it('findAll delega', async () => {
    service.findAll.mockResolvedValue([] as any);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('approve delega requestId, adminId y dto', async () => {
    const dto = { reviewNotes: 'ok' } as any;
    service.approve.mockResolvedValue({ id: 'req1' } as any);
    await controller.approve('req1', 'admin1', dto);
    expect(service.approve).toHaveBeenCalledWith('req1', 'admin1', dto);
  });

  it('reject delega requestId, adminId y dto', async () => {
    const dto = { reviewNotes: 'no' } as any;
    service.reject.mockResolvedValue({ id: 'req1' } as any);
    await controller.reject('req1', 'admin1', dto);
    expect(service.reject).toHaveBeenCalledWith('req1', 'admin1', dto);
  });
});
