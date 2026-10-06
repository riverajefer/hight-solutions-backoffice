import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma';
import { BoardOrder, ProductionBoardRepository } from './production-board.repository';
import { ProductionBoardService } from './production-board.service';

const mockRepository = {
  findBoardOrders: jest.fn(),
  countStaleOpenOrders: jest.fn(),
};

const area = (id: string, name: string) => ({ productionArea: { id, name } });

const buildOrder = (overrides: Partial<BoardOrder> = {}): BoardOrder => ({
  id: 'order-1',
  orderNumber: 'OP-2026-0001',
  status: 'CONFIRMED',
  orderDate: new Date('2026-10-01T15:00:00.000Z'),
  deliveryDate: new Date('2026-10-06T17:00:00.000Z'),
  total: new Prisma.Decimal('250000'),
  balance: new Prisma.Decimal('100000'),
  client: { id: 'client-1', name: 'Cliente de prueba' },
  createdBy: { id: 'user-1', firstName: 'ADRIANA', lastName: 'PEREZ' },
  items: [
    {
      id: 'item-1',
      description: 'Mugs',
      quantity: new Prisma.Decimal('12'),
      annulledQuantity: new Prisma.Decimal('0'),
      productionAreas: [area('area-1', 'Sublimación')],
    },
  ],
  workOrders: [],
  _count: { dtfRecords: 0 },
  ...overrides,
});

describe('ProductionBoardService', () => {
  let service: ProductionBoardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBoardService,
        { provide: ProductionBoardRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get(ProductionBoardService);

    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
    mockRepository.findBoardOrders.mockResolvedValue([]);
    mockRepository.countStaleOpenOrders.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getBoard', () => {
    it('should use a 30-day window by default', async () => {
      const result = await service.getBoard({});

      const cutoff = new Date('2026-09-05T12:00:00.000Z');
      expect(mockRepository.findBoardOrders).toHaveBeenCalledWith(cutoff);
      expect(mockRepository.countStaleOpenOrders).toHaveBeenCalledWith(cutoff);
      expect(result.cutoffDate).toBe(cutoff.toISOString());
      expect(result.generatedAt).toBe('2026-10-05T12:00:00.000Z');
    });

    it('should honor the requested window', async () => {
      await service.getBoard({ days: 7 });

      expect(mockRepository.findBoardOrders).toHaveBeenCalledWith(
        new Date('2026-09-28T12:00:00.000Z'),
      );
    });

    it('should return the stale open count', async () => {
      mockRepository.countStaleOpenOrders.mockResolvedValue(42);

      const result = await service.getBoard({});

      expect(result.staleOpenCount).toBe(42);
    });

    it('should map an order to a card with plain numbers and ISO dates', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([buildOrder()]);

      const { cards } = await service.getBoard({});

      expect(cards).toEqual([
        {
          id: 'order-1',
          orderNumber: 'OP-2026-0001',
          status: 'CONFIRMED',
          orderDate: '2026-10-01T15:00:00.000Z',
          deliveryDate: '2026-10-06T17:00:00.000Z',
          total: 250000,
          balance: 100000,
          clientName: 'Cliente de prueba',
          advisor: { id: 'user-1', name: 'ADRIANA PEREZ' },
          isCounterSale: false,
          workOrder: null,
          areas: [{ id: 'area-1', name: 'Sublimación' }],
          items: [
            { id: 'item-1', description: 'Mugs', quantity: 12, areas: ['Sublimación'] },
          ],
        },
      ]);
    });

    it('should keep deliveryDate null when the order has no date', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({ deliveryDate: null }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].deliveryDate).toBeNull();
    });

    it('should flag orders born from a DTF as counter sales', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({ _count: { dtfRecords: 1 } }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].isCounterSale).toBe(true);
    });

    it('should expose the active work order', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({
          workOrders: [
            { id: 'wo-1', workOrderNumber: 'OT-2026-0009', status: 'IN_PRODUCTION' },
          ],
        }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].workOrder).toEqual({
        id: 'wo-1',
        number: 'OT-2026-0009',
        status: 'IN_PRODUCTION',
      });
    });

    it('should report net quantities and drop fully annulled items with their areas', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({
          items: [
            {
              id: 'item-1',
              description: 'Mugs',
              quantity: new Prisma.Decimal('12'),
              annulledQuantity: new Prisma.Decimal('2'),
              productionAreas: [area('area-1', 'Sublimación')],
            },
            {
              id: 'item-2',
              description: 'Banderas',
              quantity: new Prisma.Decimal('6'),
              annulledQuantity: new Prisma.Decimal('6'),
              productionAreas: [area('area-2', 'Confeccion')],
            },
          ],
        }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].items).toEqual([
        { id: 'item-1', description: 'Mugs', quantity: 10, areas: ['Sublimación'] },
      ]);
      expect(cards[0].areas).toEqual([{ id: 'area-1', name: 'Sublimación' }]);
    });

    it('should list each production area once per order', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({
          items: [
            {
              id: 'item-1',
              description: 'Mugs',
              quantity: new Prisma.Decimal('12'),
              annulledQuantity: new Prisma.Decimal('0'),
              productionAreas: [area('area-1', 'Sublimación')],
            },
            {
              id: 'item-2',
              description: 'Camisetas',
              quantity: new Prisma.Decimal('5'),
              annulledQuantity: new Prisma.Decimal('0'),
              productionAreas: [area('area-1', 'Sublimación'), area('area-3', 'DTF Textil')],
            },
          ],
        }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].areas).toEqual([
        { id: 'area-1', name: 'Sublimación' },
        { id: 'area-3', name: 'DTF Textil' },
      ]);
    });

    it('should fall back to a placeholder when the advisor has no name', async () => {
      mockRepository.findBoardOrders.mockResolvedValue([
        buildOrder({ createdBy: { id: 'user-2', firstName: null, lastName: null } }),
      ]);

      const { cards } = await service.getBoard({});

      expect(cards[0].advisor).toEqual({ id: 'user-2', name: 'Sin nombre' });
    });
  });
});
