import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementVoidRequestsController } from './cash-movement-void-requests.controller';
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { PrismaService } from '../../database/prisma.service';

describe('CashMovementVoidRequestsController', () => {
  let controller: CashMovementVoidRequestsController;
  let service: jest.Mocked<CashMovementVoidRequestsService>;

  beforeEach(async () => {
    service = { create: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashMovementVoidRequestsController],
      providers: [
        { provide: CashMovementVoidRequestsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CashMovementVoidRequestsController>(CashMovementVoidRequestsController);
  });

  it('create delega movementId, userId y dto', async () => {
    const dto = { voidReason: 'error' } as any;
    service.create.mockResolvedValue({ id: 'req1' } as any);
    await controller.create('cm1', 'u1', dto);
    // La solicitud puede apuntar a un movimiento o a un pago suelto, así que el
    // objetivo viaja como objeto.
    expect(service.create).toHaveBeenCalledWith(
      { cashMovementId: 'cm1' },
      'u1',
      dto,
    );
  });
});
