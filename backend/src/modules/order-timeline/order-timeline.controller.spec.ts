import { Test, TestingModule } from '@nestjs/testing';
import { OrderTimelineController } from './order-timeline.controller';
import { OrderTimelineService } from './order-timeline.service';
import { PrismaService } from '../../database/prisma.service';
import { EntityType } from './dto';

describe('OrderTimelineController', () => {
  let controller: OrderTimelineController;
  let service: jest.Mocked<OrderTimelineService>;

  beforeEach(async () => {
    service = {
      getOrderTree: jest.fn(),
      searchOrders: jest.fn(),
      getQuoteOnlyTree: jest.fn(),
      getExpenseOrderOnlyTree: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderTimelineController],
      providers: [
        { provide: OrderTimelineService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<OrderTimelineController>(OrderTimelineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call searchOrders with defaults limit', async () => {
      const result = { quotes: [], orders: [], workOrders: [], expenseOrders: [] };
      service.searchOrders.mockResolvedValue(result);

      const response = await controller.search('term');
      expect(response).toEqual(result);
      expect(service.searchOrders).toHaveBeenCalledWith('term', 20);
    });

    it('should call searchOrders with defined limit', async () => {
      await controller.search('term', '50');
      expect(service.searchOrders).toHaveBeenCalledWith('term', 50);
    });
  });

  describe('getOrderTree', () => {
    it('should return a tree successfully', async () => {
      const tree = { nodes: [], edges: [], rootId: '1', focusedId: '1' };
      service.getOrderTree.mockResolvedValue(tree);

      const response = await controller.getOrderTree(EntityType.ORDER, '1');
      expect(response).toEqual(tree);
      expect(service.getOrderTree).toHaveBeenCalledWith('1', EntityType.ORDER);
    });

    it('should handle QuoteWithoutOrderException', async () => {
      const error: any = new Error();
      error.name = 'QuoteWithoutOrderException';
      error.quoteId = 'q1';
      service.getOrderTree.mockRejectedValue(error);
      
      const res = { nodes: [], edges: [], rootId: 'q1', focusedId: 'q1' };
      service.getQuoteOnlyTree.mockResolvedValue(res);

      const response = await controller.getOrderTree(EntityType.QUOTE, 'q1');
      
      expect(service.getQuoteOnlyTree).toHaveBeenCalledWith('q1');
      expect(response).toEqual(res);
    });

    it('should handle ExpenseOrderWithoutWorkOrderException', async () => {
      const error: any = new Error();
      error.name = 'ExpenseOrderWithoutWorkOrderException';
      error.expenseOrderId = 'e1';
      service.getOrderTree.mockRejectedValue(error);
      
      const res = { nodes: [], edges: [], rootId: 'e1', focusedId: 'e1' };
      service.getExpenseOrderOnlyTree.mockResolvedValue(res);

      const response = await controller.getOrderTree(EntityType.EXPENSE_ORDER, 'e1');
      
      expect(service.getExpenseOrderOnlyTree).toHaveBeenCalledWith('e1');
      expect(response).toEqual(res);
    });

    it('should let other exceptions pass through', async () => {
      const error = new Error('Random error');
      service.getOrderTree.mockRejectedValue(error);

      await expect(controller.getOrderTree(EntityType.ORDER, 'o1')).rejects.toThrow('Random error');
    });
  });
});
