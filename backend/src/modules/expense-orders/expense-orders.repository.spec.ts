import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseOrdersRepository } from './expense-orders.repository';
import { PrismaService } from '../../database/prisma.service';

describe('ExpenseOrdersRepository', () => {
  let repository: ExpenseOrdersRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock: any = {
      expenseOrder: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      expenseOrderItem: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseOrdersRepository,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<ExpenseOrdersRepository>(ExpenseOrdersRepository);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should find all with default pagination and sorting', async () => {
      (prisma.expenseOrder.findMany as jest.Mock).mockResolvedValue([{ id: '1' }]);
      (prisma.expenseOrder.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.findAll({});
      expect(result.data).toBeDefined();
      expect(result.meta).toEqual(
        expect.objectContaining({ total: 1, limit: 20, page: 1 })
      );
      expect(prisma.expenseOrder.findMany).toHaveBeenCalled();
      expect(prisma.expenseOrder.count).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      (prisma.expenseOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expenseOrder.count as jest.Mock).mockResolvedValue(0);

      await repository.findAll({
        search: 'query',
        status: 'PENDING' as any,
        workOrderId: 'wo1',
        expenseTypeId: 'et1'
      } as any);

      expect(prisma.expenseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            workOrderId: 'wo1',
            expenseTypeId: 'et1',
          })
        })
      );
    });
  });

  describe('findById', () => {
    it('should find a unique expense order by id', async () => {
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue({ id: 'eo1' });
      const result = await repository.findById('eo1');
      expect(result).toEqual({ id: 'eo1' });
      expect(prisma.expenseOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'eo1' } })
      );
    });
  });

  describe('create', () => {
    it('should create an expense order with items', async () => {
      const createData = {
        data: { observations: 'obs' },
        createdById: 'u1',
        items: [{ detail: 'i1', amount: 10 }]
      };
      (prisma.expenseOrder.create as jest.Mock).mockResolvedValue({ id: 'newEo' });

      const result = await repository.create(createData as any);
      expect(result).toEqual({ id: 'newEo' });
      expect(prisma.expenseOrder.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an expense order', async () => {
      (prisma.expenseOrder.update as jest.Mock).mockResolvedValue({ id: 'eo1' });

      await repository.update('eo1', { observations: 'new obs' });
      expect(prisma.expenseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eo1' },
          data: { observations: 'new obs' }
        })
      );
    });
  });

  describe('replaceItems', () => {
    it('should replace items within transaction', async () => {
      (prisma.expenseOrderItem.findMany as jest.Mock).mockResolvedValue([]);
      await repository.replaceItems('eo1', [{ name: 'newDetail', amount: 100 } as any]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.expenseOrderItem.deleteMany).toHaveBeenCalledWith({
        where: { expenseOrderId: 'eo1' }
      });
      expect(prisma.expenseOrderItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ expenseOrderId: 'eo1', name: 'newDetail' })])
      });
    });
  });

  describe('addItem', () => {
    it('should add a single item', async () => {
      await repository.addItem('eo1', { name: 'item1' } as any);
      expect(prisma.expenseOrderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'item1', expenseOrderId: 'eo1' })
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and optional auth fields', async () => {
      await repository.updateStatus('eo1', 'AUTHORIZED' as any, 'auth1');
      expect(prisma.expenseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eo1' },
          data: { status: 'AUTHORIZED', authorizedById: 'auth1' }
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete an expense order', async () => {
      await repository.delete('eo1');
      expect(prisma.expenseOrder.delete).toHaveBeenCalledWith({ where: { id: 'eo1' } });
    });
  });
});
