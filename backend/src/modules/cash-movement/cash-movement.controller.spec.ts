import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementController } from './cash-movement.controller';
import { CashMovementService } from './cash-movement.service';
import { PrismaService } from '../../database/prisma.service';

describe('CashMovementController', () => {
  let controller: CashMovementController;
  let service: jest.Mocked<CashMovementService>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      createMovement: jest.fn(),
      voidMovement: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashMovementController],
      providers: [
        { provide: CashMovementService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CashMovementController>(CashMovementController);
  });

  it('findAll delega los filtros', async () => {
    const result = { data: [] };
    service.findAll.mockResolvedValue(result as any);
    expect(await controller.findAll({ page: 1 } as any)).toBe(result);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1 });
  });

  it('findOne delega el id', async () => {
    service.findOne.mockResolvedValue({ id: 'cm1' } as any);
    await controller.findOne('cm1');
    expect(service.findOne).toHaveBeenCalledWith('cm1');
  });

  it('create delega dto y userId', async () => {
    const dto = { amount: 1000 } as any;
    service.createMovement.mockResolvedValue({ id: 'cm1' } as any);
    await controller.create(dto, 'u1');
    expect(service.createMovement).toHaveBeenCalledWith(dto, 'u1');
  });

  it('void delega id, dto y userId', async () => {
    const dto = { voidReason: 'error' } as any;
    service.voidMovement.mockResolvedValue({ id: 'cm1' } as any);
    await controller.void('cm1', dto, 'u1');
    expect(service.voidMovement).toHaveBeenCalledWith('cm1', dto, 'u1');
  });
});
