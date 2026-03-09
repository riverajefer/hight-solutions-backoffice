import { Test, TestingModule } from '@nestjs/testing';
import { OrderTimelineService } from './order-timeline.service';
import { PrismaService } from '../../database/prisma.service';
import { EntityType } from './dto';
import { NotFoundException } from '@nestjs/common';

describe('OrderTimelineService', () => {
  let service: OrderTimelineService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      quote: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      workOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      expenseOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTimelineService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<OrderTimelineService>(OrderTimelineService);
    prisma = module.get(PrismaService);
  });

  describe('getOrderTree', () => {
    it('should retrieve a tree starting from an Order', async () => {
      // Mock resolveOrderId implicitly via EntityType.ORDER
      const orderData = {
        id: 'o1',
        orderNumber: 'ORD-1',
        quote: null,
        workOrders: [],
        createdAt: new Date(),
        createdBy: { firstName: 'John', lastName: 'Doe' },
        client: { name: 'Client' },
      };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderData);

      const tree = await service.getOrderTree('o1', EntityType.ORDER);
      
      expect(tree).toBeDefined();
      expect(tree.rootId).toBe('o1');
      expect(tree.focusedId).toBe('o1');
      expect(tree.nodes).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'o1', type: 'OP' })
      ]));
    });

    it('should throw NotFoundException if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrderTree('o1', EntityType.ORDER)).rejects.toThrow(NotFoundException);
    });

    it('should throw QuoteWithoutOrderException if quote has no order', async () => {
      const quoteData = { id: 'q1', orderId: null };
      (prisma.quote.findUnique as jest.Mock).mockResolvedValue(quoteData);

      await expect(service.getOrderTree('q1', EntityType.QUOTE)).rejects.toThrow('Quote q1 has no associated order');
    });
  });

  describe('getQuoteOnlyTree', () => {
    it('should return quote only tree', async () => {
      const quoteData = {
        id: 'q1',
        quoteNumber: 'Q-1',
        createdAt: new Date(),
        client: { name: 'Apple' },
        createdBy: { firstName: 'Tim', lastName: 'Cook' }
      };
      (prisma.quote.findUnique as jest.Mock).mockResolvedValue(quoteData);

      const tree = await service.getQuoteOnlyTree('q1');
      expect(tree.rootId).toBe('q1');
      expect(tree.nodes[0].type).toBe('COT');
    });
    
    it('should throw NotFoundException if quote not found', async () => {
      (prisma.quote.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getQuoteOnlyTree('q1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchOrders', () => {
    it('should search multiple entities and format dates correctly', async () => {
      (prisma.quote.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-1', createdAt: new Date('2023-01-01'), client: { name: 'Client' } }
      ]);
      (prisma.workOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expenseOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.searchOrders('term');
      
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].number).toBe('ORD-1');
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(prisma.quote.findMany).toHaveBeenCalled();
      expect(prisma.workOrder.findMany).toHaveBeenCalled();
      expect(prisma.expenseOrder.findMany).toHaveBeenCalled();
    });
  });
});
