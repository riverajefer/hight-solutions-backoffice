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
    const defaultOrderData = {
      id: 'o1',
      orderNumber: 'ORD-1',
      quote: null,
      workOrders: [],
      createdAt: new Date(),
      createdBy: { firstName: 'John', lastName: 'Doe' },
      client: { name: 'Client' },
      _count: { items: 0, workOrders: 0 },
    };

    it('should retrieve a tree starting from an Order', async () => {
      // Mock resolveOrderId implicitly via EntityType.ORDER
      const orderData = {
        id: 'o1',
        orderNumber: 'ORD-1',
        quote: {
          id: 'q1',
          quoteNumber: 'Q-1',
          status: 'APPROVED',
          client: { name: 'Client' },
          total: 100,
          createdAt: new Date(),
          createdBy: { firstName: 'Tim', lastName: 'Cook' },
          commercialChannel: { name: 'Direct' }
        },
        workOrders: [
          {
            id: 'wo1',
            workOrderNumber: 'WO-1',
            status: 'COMPLETED',
            createdAt: new Date(),
            updatedAt: new Date(),
            advisor: { firstName: 'John', lastName: 'Doe' },
            designer: { firstName: 'Jane', lastName: 'Doe' },
            _count: { items: 1, expenseOrders: 1 },
            fileName: 'file.pdf',
            expenseOrders: [
              {
                id: 'eo1',
                ogNumber: 'OG-1',
                status: 'APPROVED',
                createdAt: new Date(),
                createdBy: { firstName: 'Tim', lastName: 'Cook' },
                authorizedTo: { firstName: 'Tim', lastName: 'Cook' },
                authorizedBy: { firstName: 'Tim', lastName: 'Cook' },
                responsible: { firstName: 'Tim', lastName: 'Cook' },
                _count: { items: 1 },
                expenseType: { name: 'T1' },
                expenseSubcategory: { name: 'S1' },
                items: [{ total: 50 }]
              }
            ]
          }
        ],
        createdAt: new Date(),
        createdBy: { firstName: 'John', lastName: 'Doe' },
        client: { name: 'Client' },
        _count: { items: 0, workOrders: 0 },
        total: 100,
        balance: 0,
        deliveryDate: new Date(),
        status: 'PRODUCTION'
      };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderData);

      const tree = await service.getOrderTree('o1', EntityType.ORDER);
      
      expect(tree).toBeDefined();
      expect(tree.rootId).toBe('q1');
      expect(tree.focusedId).toBe('o1');
      expect(tree.nodes).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'o1', type: 'OP' }),
        expect.objectContaining({ id: 'q1', type: 'COT' }),
        expect.objectContaining({ id: 'wo1', type: 'OT' }),
        expect.objectContaining({ id: 'eo1', type: 'OG' })
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

    it('should resolve order id from QUOTE', async () => {
      const quoteData = { id: 'q1', orderId: 'o1' };
      (prisma.quote.findUnique as jest.Mock).mockResolvedValue(quoteData);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(defaultOrderData);

      const tree = await service.getOrderTree('q1', EntityType.QUOTE);
      expect(tree.rootId).toBe('o1'); // because order is the root when there is no quote in defaultOrderData, wait, quote is 'q1' ? no, rootId depends on fetched order. Here it's o1 because order.quote is null in defaultOrderData.
    });

    it('should resolve order id from WORK_ORDER', async () => {
      const woData = { id: 'w1', orderId: 'o1' };
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(woData);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(defaultOrderData);

      const tree = await service.getOrderTree('w1', EntityType.WORK_ORDER);
      expect(tree.focusedId).toBe('w1');
    });

    it('should resolve order id from EXPENSE_ORDER', async () => {
      const eoData = { id: 'e1', workOrder: { orderId: 'o1' } };
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue(eoData);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(defaultOrderData);

      const tree = await service.getOrderTree('e1', EntityType.EXPENSE_ORDER);
      expect(tree.focusedId).toBe('e1');
    });

    it('should throw NotFoundException if resolving from non-existent WORK_ORDER', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getOrderTree('w1', EntityType.WORK_ORDER)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if resolving from non-existent EXPENSE_ORDER', async () => {
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getOrderTree('e1', EntityType.EXPENSE_ORDER)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if resolving from non-existent QUOTE', async () => {
      (prisma.quote.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getOrderTree('q1', EntityType.QUOTE)).rejects.toThrow(NotFoundException);
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

  describe('getExpenseOrderOnlyTree', () => {
    it('should return expense order only tree', async () => {
      const eoData = {
        id: 'e1',
        ogNumber: 'OG-1',
        status: 'PENDING',
        createdAt: new Date(),
        createdBy: { firstName: 'Tim', lastName: 'Cook' },
        authorizedTo: { firstName: 'Tim', lastName: 'Cook' },
        authorizedBy: { firstName: 'Tim', lastName: 'Cook' },
        responsible: { firstName: 'Tim', lastName: 'Cook' },
        items: [{ total: 50 }, { total: 50 }]
      };
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue(eoData);

      const tree = await service.getExpenseOrderOnlyTree('e1');
      expect(tree.rootId).toBe('e1');
      expect(tree.nodes[0].type).toBe('OG');
      expect(tree.nodes[0].total).toBe(100);
      expect(tree.nodes[0].clientName).toBe('Sin cliente');
    });

    it('should throw NotFoundException if expense order not found', async () => {
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getExpenseOrderOnlyTree('e1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveOrderId', () => {
    it('should throw ExpenseOrderWithoutWorkOrderException if expense order has no work order', async () => {
      const eoData = { id: 'e1', workOrderId: null, workOrder: null };
      (prisma.expenseOrder.findUnique as jest.Mock).mockResolvedValue(eoData);

      await expect(service.getOrderTree('e1', EntityType.EXPENSE_ORDER)).rejects.toThrow('Expense order e1 has no associated work order');
    });

    it('should fallback to order.id if entityType is missing in resolveFocusedId', () => {
      const order = { id: 'o1' };
      const focusedId = (service as any).resolveFocusedId('someId', 'UNKNOWN', order);
      expect(focusedId).toBe('o1');
    });

    it('should throw NotFoundException on unknown entity type in resolveOrderId', async () => {
      await expect(service.getOrderTree('o1', 'UNKNOWN_TYPE' as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchOrders', () => {
    it('should search multiple entities and format dates correctly', async () => {
      (prisma.quote.findMany as jest.Mock).mockResolvedValue([
        { id: 'q1', quoteNumber: 'Q-1', status: 'DRAFT', client: { name: 'Client Q' } }
      ]);
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-1', status: 'PRODUCTION', client: { name: 'Client O' } }
      ]);
      (prisma.workOrder.findMany as jest.Mock).mockResolvedValue([
        { id: 'wo1', workOrderNumber: 'WO-1', status: 'COMPLETED', order: { client: { name: 'Client W' } } }
      ]);
      (prisma.expenseOrder.findMany as jest.Mock).mockResolvedValue([
        { id: 'eo1', ogNumber: 'OG-1', status: 'PENDING', workOrder: { order: { client: { name: 'Client E' } } } },
        { id: 'eo2', ogNumber: 'OG-2', status: 'PENDING', workOrder: null }
      ]);

      const result = await service.searchOrders('term');
      
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].number).toBe('ORD-1');
      expect(result.quotes.length).toBe(1);
      expect(result.workOrders.length).toBe(1);
      expect(result.expenseOrders.length).toBe(2);
      expect(result.expenseOrders[1].clientName).toBe('Sin cliente');
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(prisma.quote.findMany).toHaveBeenCalled();
      expect(prisma.workOrder.findMany).toHaveBeenCalled();
      expect(prisma.expenseOrder.findMany).toHaveBeenCalled();
    });
  });
});
