import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from './orders.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';
import { OrderStatus } from '../../generated/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const mockOrderRow = {
  id: 'order-1',
  orderNumber: 'OP-2026-001',
  status: OrderStatus.DRAFT,
  deliveryDateChangedBy: null,
  subtotal: '100.00',
  tax: '19.00',
  total: '119.00',
  paidAmount: '0.00',
  balance: '119.00',
};

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAllWithFilters
  // ─────────────────────────────────────────────
  describe('findAllWithFilters', () => {
    beforeEach(() => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([mockOrderRow]);
      (prisma.order.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return paginated results with correct meta when filters are empty', async () => {
      const result = await repository.findAllWithFilters({});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply status filter to prisma where clause', async () => {
      await repository.findAllWithFilters({ status: OrderStatus.CONFIRMED });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.CONFIRMED }),
        }),
      );
    });

    it('should apply clientId filter to prisma where clause', async () => {
      await repository.findAllWithFilters({ clientId: 'client-1' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'client-1' }),
        }),
      );
    });

    it('should apply date range filter when orderDateFrom and orderDateTo are provided', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');

      await repository.findAllWithFilters({ orderDateFrom: from, orderDateTo: to });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderDate: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('should calculate correct skip value based on page and limit', async () => {
      await repository.findAllWithFilters({ page: 3, limit: 10 });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should calculate totalPages correctly when total is not divisible by limit', async () => {
      (prisma.order.count as jest.Mock).mockResolvedValue(25);

      const result = await repository.findAllWithFilters({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ─────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────
  describe('findById', () => {
    it('should return order when found and deliveryDateChangedBy is null', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrderRow);

      const result = await repository.findById('order-1');

      expect(result).toMatchObject({ id: 'order-1' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch deliveryDateChangedByUser when deliveryDateChangedBy is set', async () => {
      const orderWithDateChange = {
        ...mockOrderRow,
        deliveryDateChangedBy: 'user-1',
      };
      const changedByUser = {
        id: 'user-1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderWithDateChange);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(changedByUser);

      const result = await repository.findById('order-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect((result as any).deliveryDateChangedByUser).toEqual(changedByUser);
    });

    it('should return null when order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('bad-id');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    it('should call prisma.order.create then findById with the created id', async () => {
      (prisma.order.create as jest.Mock).mockResolvedValue({ id: 'order-new', orderNumber: 'OP-001', status: 'DRAFT' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrderRow, id: 'order-new' });

      const result = await repository.create({ orderNumber: 'OP-001' } as any);

      expect(prisma.order.create).toHaveBeenCalledTimes(1);
      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-new' } }),
      );
      expect(result).toMatchObject({ id: 'order-new' });
    });
  });

  // ─────────────────────────────────────────────
  // updateStatus
  // ─────────────────────────────────────────────
  describe('updateStatus', () => {
    it('should call prisma.order.update with only the status field', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrderRow,
        status: OrderStatus.CONFIRMED,
      });

      await repository.updateStatus('order-1', OrderStatus.CONFIRMED);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.CONFIRMED },
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // registerElectronicInvoice
  // ─────────────────────────────────────────────
  describe('registerElectronicInvoice', () => {
    it('should update only the electronicInvoiceNumber field', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrderRow,
        electronicInvoiceNumber: 'FE-001',
      });

      await repository.registerElectronicInvoice('order-1', 'FE-001');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { electronicInvoiceNumber: 'FE-001' },
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // findItemById
  // ─────────────────────────────────────────────
  describe('findItemById', () => {
    it('should return item with order relation included', async () => {
      const mockItem = {
        id: 'item-1',
        orderId: 'order-1',
        order: { id: 'order-1', status: OrderStatus.DRAFT },
      };
      (prisma.orderItem.findUnique as jest.Mock).mockResolvedValue(mockItem);

      const result = await repository.findItemById('item-1');

      expect(prisma.orderItem.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-1' } }),
      );
      expect(result).toMatchObject({ id: 'item-1', order: { status: OrderStatus.DRAFT } });
    });
  });

  // ─────────────────────────────────────────────
  // findPaymentsByOrderId
  // ─────────────────────────────────────────────
  describe('findPaymentsByOrderId', () => {
    it('should return payments ordered by paymentDate desc', async () => {
      const mockPayments = [
        { id: 'pay-2', paymentDate: new Date('2026-01-15') },
        { id: 'pay-1', paymentDate: new Date('2026-01-10') },
      ];
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await repository.findPaymentsByOrderId('order-1');

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          orderBy: { paymentDate: 'desc' },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pay-2');
    });
  });

  // ─────────────────────────────────────────────
  // findDiscountsByOrderId
  // ─────────────────────────────────────────────
  describe('findDiscountsByOrderId', () => {
    it('should return discounts ordered by appliedAt desc', async () => {
      const mockDiscounts = [
        { id: 'disc-2', appliedAt: new Date('2026-01-15') },
        { id: 'disc-1', appliedAt: new Date('2026-01-10') },
      ];
      (prisma.orderDiscount.findMany as jest.Mock).mockResolvedValue(mockDiscounts);

      const result = await repository.findDiscountsByOrderId('order-1');

      expect(prisma.orderDiscount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          orderBy: { appliedAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('disc-2');
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    it('should update order and return updated data', async () => {
      const updateData = { notes: 'Updated notes' };
      const updatedOrder = { ...mockOrderRow, ...updateData };
      (prisma.order.update as jest.Mock).mockResolvedValue(updatedOrder);

      const result = await repository.update('order-1', updateData);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: updateData,
        }),
      );
      expect(result).toMatchObject(updatedOrder);
    });
  });

  // ─────────────────────────────────────────────
  // delete
  // ─────────────────────────────────────────────
  describe('delete', () => {
    it('should delete order', async () => {
      (prisma.order.delete as jest.Mock).mockResolvedValue(mockOrderRow);

      await repository.delete('order-1');

      expect(prisma.order.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // createPayment
  // ─────────────────────────────────────────────
  describe('createPayment', () => {
    it('should create payment', async () => {
      const paymentData = {
        order: { connect: { id: 'order-1' } },
        amount: '50.00',
        paymentMethod: 'CASH' as const,
        paymentDate: new Date(),
        reference: 'REF-001',
        notes: 'Payment notes',
        receivedBy: { connect: { id: 'user-1' } },
      };
      const createdPayment = { id: 'pay-1', amount: '50.00', paymentMethod: 'CASH', paymentDate: new Date(), reference: 'REF-001', notes: 'Payment notes' };

      (prisma.payment.create as jest.Mock).mockResolvedValue(createdPayment);

      const result = await repository.createPayment(paymentData);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: paymentData,
        }),
      );
      expect(result).toMatchObject(createdPayment);
    });
  });

  // ─────────────────────────────────────────────
  // findByOrderNumber
  // ─────────────────────────────────────────────
  describe('findByOrderNumber', () => {
    it('should return order by order number', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrderRow);

      const result = await repository.findByOrderNumber('OP-2026-001');

      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderNumber: 'OP-2026-001' },
        }),
      );
      expect(result).toMatchObject(mockOrderRow);
    });
  });

  // ─────────────────────────────────────────────
  // getTotalsByClient
  // ─────────────────────────────────────────────
  describe('getTotalsByClient', () => {
    it('should return totals for client', async () => {
      const mockTotals = {
        _sum: { total: '100.00', paidAmount: '50.00', balance: '50.00' },
        _count: 5,
      };
      (prisma.order.aggregate as jest.Mock).mockResolvedValue(mockTotals);

      const result = await repository.getTotalsByClient('client-1');

      expect(prisma.order.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'client-1' },
          _sum: {
            total: true,
            paidAmount: true,
            balance: true,
          },
          _count: true,
        }),
      );
      expect(result).toEqual(mockTotals);
    });
  });

  // ─────────────────────────────────────────────
  // createItem
  // ─────────────────────────────────────────────
  describe('createItem', () => {
    it('should create order item', async () => {
      const itemData = {
        order: { connect: { id: 'order-1' } },
        description: 'Test item',
        quantity: 1,
        unitPrice: '10.00',
        total: '10.00',
      };
      const createdItem = { id: 'item-1', description: 'Test item', quantity: 1, unitPrice: '10.00', total: '10.00' };
      (prisma.orderItem.create as jest.Mock).mockResolvedValue(createdItem);

      const result = await repository.createItem(itemData);

      expect(prisma.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: itemData,
        }),
      );
      expect(result).toMatchObject(createdItem);
    });
  });

  // ─────────────────────────────────────────────
  // updateItem
  // ─────────────────────────────────────────────
  describe('updateItem', () => {
    it('should update order item', async () => {
      const updateData = { description: 'Updated description' };
      const updatedItem = { id: 'item-1', ...updateData };
      (prisma.orderItem.update as jest.Mock).mockResolvedValue(updatedItem);

      const result = await repository.updateItem('item-1', updateData);

      expect(prisma.orderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: updateData,
        }),
      );
      expect(result).toMatchObject(updatedItem);
    });
  });

  // ─────────────────────────────────────────────
  // deleteItem
  // ─────────────────────────────────────────────
  describe('deleteItem', () => {
    it('should delete order item', async () => {
      const mockItem = { id: 'item-1', description: 'Test item' };
      (prisma.orderItem.delete as jest.Mock).mockResolvedValue(mockItem);

      await repository.deleteItem('item-1');

      expect(prisma.orderItem.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
        }),
      );
    });
  });
});
