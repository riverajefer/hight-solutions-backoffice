import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';
import { OrderStatus } from '../../generated/prisma';
import {
  boardOrderSelect,
  ProductionBoardRepository,
} from './production-board.repository';

describe('ProductionBoardRepository', () => {
  let repository: ProductionBoardRepository;
  let prisma: MockPrismaService;
  const cutoff = new Date('2026-09-05T00:00:00.000Z');

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBoardRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get(ProductionBoardRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findBoardOrders', () => {
    it('should query orders inside the window, in board statuses, with the lean select', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await repository.findBoardOrders(cutoff);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          orderDate: { gte: cutoff },
          status: {
            in: [
              OrderStatus.DRAFT,
              OrderStatus.CONFIRMED,
              OrderStatus.IN_PRODUCTION,
              OrderStatus.READY,
              OrderStatus.PAID,
            ],
          },
        },
        select: boardOrderSelect,
        orderBy: { orderDate: 'desc' },
      });
    });

    it('should leave cancelled work orders out of the card', () => {
      expect(boardOrderSelect.workOrders.where).toEqual({
        status: { not: 'CANCELLED' },
      });
    });
  });

  describe('countStaleOpenOrders', () => {
    it('should count open orders older than the window, without drafts', async () => {
      prisma.order.count.mockResolvedValue(7);

      const result = await repository.countStaleOpenOrders(cutoff);

      expect(result).toBe(7);
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {
          orderDate: { lt: cutoff },
          status: {
            in: [
              OrderStatus.CONFIRMED,
              OrderStatus.IN_PRODUCTION,
              OrderStatus.READY,
              OrderStatus.PAID,
            ],
          },
        },
      });
    });
  });
});
