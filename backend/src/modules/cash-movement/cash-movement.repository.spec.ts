import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementRepository } from './cash-movement.repository';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService } from '../../database/prisma.service.mock';

describe('CashMovementRepository', () => {
  let repository: CashMovementRepository;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<CashMovementRepository>(CashMovementRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('devuelve null cuando el movimiento no existe', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(null as any);
      await expect(repository.findById('x')).resolves.toBeNull();
    });

    it('enriquece la referencia ORDER con datos de la orden', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue({
        id: 'cm1',
        referenceType: 'ORDER',
        referenceId: 'o1',
      } as any);
      prisma.order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'OP-2026-0001', status: 'ACTIVE', client: { name: 'ACME' } },
      ] as any);

      const result: any = await repository.findById('cm1');

      expect(result.orderRef).toEqual(
        expect.objectContaining({ orderNumber: 'OP-2026-0001' }),
      );
      expect(result.expenseOrderRef).toBeNull();
    });

    it('enriquece la referencia EXPENSE_ORDER con datos de la OG', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue({
        id: 'cm1',
        referenceType: 'EXPENSE_ORDER',
        referenceId: 'og1',
      } as any);
      prisma.expenseOrder.findMany.mockResolvedValue([
        { id: 'og1', ogNumber: 'OG-2026-0001', status: 'PENDING', expenseType: { name: 'Servicios' } },
      ] as any);

      const result: any = await repository.findById('cm1');

      expect(result.expenseOrderRef).toEqual(
        expect.objectContaining({ ogNumber: 'OG-2026-0001' }),
      );
      expect(result.orderRef).toBeNull();
    });
  });

  describe('findAll', () => {
    it('aplica los filtros y excluye anulados por defecto', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([] as any);
      prisma.cashMovement.count.mockResolvedValue(0 as any);

      const result = await repository.findAll({
        cashSessionId: 'cs1',
        movementType: 'INCOME',
        page: 2,
        limit: 10,
      } as any);

      const where = prisma.cashMovement.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({ cashSessionId: 'cs1', movementType: 'INCOME', isVoided: false }),
      );
      // page 2, limit 10 → skip 10
      expect(prisma.cashMovement.findMany.mock.calls[0][0].skip).toBe(10);
      expect(result).toEqual({ data: [], total: 0, page: 2, limit: 10 });
    });

    it('incluye anulados y filtra por rango de fechas cuando se solicita', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([] as any);
      prisma.cashMovement.count.mockResolvedValue(0 as any);

      await repository.findAll({
        includeVoided: true,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      const where = prisma.cashMovement.findMany.mock.calls[0][0].where;
      expect(where.isVoided).toBeUndefined();
      expect(where.createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(where.createdAt.lte).toEqual(new Date('2026-01-31'));
    });
  });

  describe('create/update', () => {
    it('create delega en prisma', async () => {
      prisma.cashMovement.create.mockResolvedValue({ id: 'cm1' } as any);
      await repository.create({ amount: 100 } as any);
      expect(prisma.cashMovement.create).toHaveBeenCalled();
    });

    it('update delega en prisma con el id', async () => {
      prisma.cashMovement.update.mockResolvedValue({ id: 'cm1' } as any);
      await repository.update('cm1', { isVoided: true } as any);
      expect(prisma.cashMovement.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cm1' } }),
      );
    });
  });
});
