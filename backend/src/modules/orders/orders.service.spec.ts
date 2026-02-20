// Mock uuid before any imports (uuid v9+ is ESM-only and cannot be parsed by Jest/ts-jest directly)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageService } from '../storage/storage.service';
import { OrderStatusChangeRequestsService } from '../order-status-change-requests/order-status-change-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, OrderStatus, PaymentMethod } from '../../generated/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Mock collaborators
// ─────────────────────────────────────────────────────────────────────────────

const mockOrdersRepository = {
  findAll: jest.fn(),
  findAllWithFilters: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
  findItemById: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  findPaymentsByOrderId: jest.fn(),
  findDiscountsByOrderId: jest.fn(),
  registerElectronicInvoice: jest.fn(),
};

const mockConsecutivesService = {
  generateNumber: jest.fn(),
};

const mockAuditLogsService = {
  logOrderChange: jest.fn(),
};

const mockStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  hardDeleteFile: jest.fn(),
};

const mockStatusChangeRequestsService = {
  requiresAuthorization: jest.fn(),
  hasApprovedRequest: jest.fn(),
  consumeApprovedRequest: jest.fn(),
};

// PrismaService: used for $transaction and direct model access (payment, orderDiscount)
const mockPrisma = {
  $transaction: jest.fn(),
  payment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  orderDiscount: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  orderItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  orderItemProductionArea: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const buildOrder = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 'order-1',
  orderNumber: 'OP-2026-001',
  status: OrderStatus.DRAFT,
  subtotal: new Prisma.Decimal('100.00'),
  taxRate: new Prisma.Decimal('0.19'),
  tax: new Prisma.Decimal('19.00'),
  discountAmount: new Prisma.Decimal('0.00'),
  total: new Prisma.Decimal('119.00'),
  paidAmount: new Prisma.Decimal('0.00'),
  balance: new Prisma.Decimal('119.00'),
  deliveryDate: null,
  notes: null,
  electronicInvoiceNumber: null,
  items: [{ id: 'item-1', orderId: 'order-1', quantity: 2, unitPrice: 50 }],
  payments: [],
  discounts: [],
  ...overrides,
});

const mockOrder = buildOrder();
const mockConfirmedOrder = buildOrder({ status: OrderStatus.CONFIRMED });

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    // Make $transaction execute the callback synchronously with mockPrisma as the tx client
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => any) => fn(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: mockOrdersRepository },
        { provide: ConsecutivesService, useValue: mockConsecutivesService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: OrderStatusChangeRequestsService,
          useValue: mockStatusChangeRequestsService,
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to ordersRepository.findAllWithFilters with parsed dates', async () => {
      mockOrdersRepository.findAllWithFilters.mockResolvedValue({ data: [], meta: {} });

      await service.findAll({
        orderDateFrom: '2026-01-01',
        orderDateTo: '2026-01-31',
        status: OrderStatus.CONFIRMED,
        clientId: 'client-1',
        page: 2,
        limit: 10,
      });

      expect(mockOrdersRepository.findAllWithFilters).toHaveBeenCalledWith({
        status: OrderStatus.CONFIRMED,
        clientId: 'client-1',
        orderDateFrom: new Date('2026-01-01'),
        orderDateTo: new Date('2026-01-31'),
        page: 2,
        limit: 10,
      });
    });

    it('should pass undefined dates when not provided in filters', async () => {
      mockOrdersRepository.findAllWithFilters.mockResolvedValue({ data: [], meta: {} });

      await service.findAll({});

      expect(mockOrdersRepository.findAllWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          orderDateFrom: undefined,
          orderDateTo: undefined,
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return the order when found', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1');

      expect(result).toMatchObject({ id: 'order-1', orderNumber: 'OP-2026-001' });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Order with ID bad-id not found',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const baseCreateDto = {
      clientId: 'client-1',
      items: [{ description: 'Item A', quantity: 2, unitPrice: 50 }],
    };

    beforeEach(() => {
      mockConsecutivesService.generateNumber.mockResolvedValue('OP-2026-001');
      mockOrdersRepository.create.mockResolvedValue(mockOrder);
    });

    it('should throw BadRequestException when items array is empty', async () => {
      await expect(
        service.create({ ...baseCreateDto, items: [] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...baseCreateDto, items: [] }, 'user-1'),
      ).rejects.toThrow('Order must have at least one item');
    });

    it('should throw BadRequestException when items is undefined', async () => {
      await expect(
        service.create({ clientId: 'client-1', items: undefined as any }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate order number via consecutivesService.generateNumber', async () => {
      await service.create(baseCreateDto, 'user-1');

      expect(mockConsecutivesService.generateNumber).toHaveBeenCalledWith('ORDER');
    });

    it('should calculate correct subtotal (qty * unitPrice), tax (19%), and total', async () => {
      // 2 * 50 = 100 subtotal, 100 * 0.19 = 19 tax, total = 119
      await service.create(baseCreateDto, 'user-1');

      const callArg = mockOrdersRepository.create.mock.calls[0][0];
      expect(callArg.subtotal.toString()).toBe('100');
      // Prisma.Decimal arithmetic: 100 * 0.19 = 19, total = 100 + 19 = 119
      expect(Number(callArg.tax.toString())).toBe(19);
      expect(Number(callArg.total.toString())).toBe(119);
    });

    it('should call ordersRepository.create with the correct data structure', async () => {
      await service.create(baseCreateDto, 'user-1');

      expect(mockOrdersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNumber: 'OP-2026-001',
          client: { connect: { id: 'client-1' } },
          createdBy: { connect: { id: 'user-1' } },
        }),
      );
    });

    it('should not include payment when initialPayment is not provided', async () => {
      await service.create(baseCreateDto, 'user-1');

      const callArg = mockOrdersRepository.create.mock.calls[0][0];
      expect(callArg.payments).toBeUndefined();
    });

    it('should include initial payment data when initialPayment is provided', async () => {
      await service.create(
        {
          ...baseCreateDto,
          initialPayment: { amount: 50, paymentMethod: PaymentMethod.CASH },
        },
        'user-1',
      );

      const callArg = mockOrdersRepository.create.mock.calls[0][0];
      expect(callArg.payments).toBeDefined();
      expect(callArg.payments.create[0]).toMatchObject({
        amount: expect.objectContaining({ toString: expect.any(Function) }),
        paymentMethod: PaymentMethod.CASH,
      });
    });

    it('should throw BadRequestException when initialPayment exceeds order total', async () => {
      // total = 119, initialPayment = 200 → should fail
      await expect(
        service.create(
          {
            ...baseCreateDto,
            initialPayment: { amount: 200, paymentMethod: PaymentMethod.CASH },
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(
          {
            ...baseCreateDto,
            initialPayment: { amount: 200, paymentMethod: PaymentMethod.CASH },
          },
          'user-1',
        ),
      ).rejects.toThrow('Initial payment cannot exceed order total');
    });

    it('should set balance = total - paidAmount when payment is provided', async () => {
      await service.create(
        {
          ...baseCreateDto,
          initialPayment: { amount: 50, paymentMethod: PaymentMethod.CASH },
        },
        'user-1',
      );

      const callArg = mockOrdersRepository.create.mock.calls[0][0];
      // subtotal=100, tax=19, total=119, paid=50, balance=69
      expect(Number(callArg.balance.toString())).toBe(69);
    });

    it('should include commercialChannel connect when commercialChannelId is provided', async () => {
      await service.create(
        { ...baseCreateDto, commercialChannelId: 'channel-1' },
        'user-1',
      );

      expect(mockOrdersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commercialChannel: { connect: { id: 'channel-1' } },
        }),
      );
    });

    it('should call auditLogsService.logOrderChange with CREATE action (fire-and-forget)', async () => {
      await service.create(baseCreateDto, 'user-1');

      expect(mockAuditLogsService.logOrderChange).toHaveBeenCalledWith(
        'CREATE',
        mockOrder.id,
        null,
        mockOrder,
        'user-1',
      );
    });
  });

  // ─────────────────────────────────────────────
  // update — simple path (no items, no initialPayment)
  // ─────────────────────────────────────────────
  describe('update (simple — no items or initialPayment)', () => {
    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.update.mockResolvedValue(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { notes: 'x' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when postponing delivery date without reason', async () => {
      const existingDate = new Date('2026-01-10');
      const laterDate = '2026-01-20';
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ deliveryDate: existingDate }),
      );

      await expect(
        service.update('order-1', { deliveryDate: laterDate }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('order-1', { deliveryDate: laterDate }, 'user-1'),
      ).rejects.toThrow('Debe proporcionar una razón para posponer la fecha de entrega');
    });

    it('should allow updating delivery date without reason when new date is earlier', async () => {
      const existingDate = new Date('2026-01-20');
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ deliveryDate: existingDate }),
      );

      await expect(
        service.update('order-1', { deliveryDate: '2026-01-10' }, 'user-1'),
      ).resolves.toBeDefined();
    });

    it('should record previousDeliveryDate and deliveryDateChangedBy when date changes', async () => {
      const existingDate = new Date('2026-01-20');
      const newDate = '2026-01-10'; // earlier, no reason required
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ deliveryDate: existingDate }),
      );

      await service.update('order-1', { deliveryDate: newDate }, 'user-1');

      const callArg = mockOrdersRepository.update.mock.calls[0][1];
      expect(callArg).toMatchObject({
        previousDeliveryDate: existingDate,
        deliveryDateChangedBy: 'user-1',
      });
      expect(callArg.deliveryDateChangedAt).toBeInstanceOf(Date);
    });

    it('should update order via repository and return the updated order', async () => {
      mockOrdersRepository.update.mockResolvedValue({ ...mockOrder, notes: 'updated' });
      mockOrdersRepository.findById.mockResolvedValueOnce(mockOrder).mockResolvedValueOnce({ ...mockOrder, notes: 'updated' });

      const result = await service.update('order-1', { notes: 'updated' }, 'user-1');

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({ notes: 'updated' }),
      );
      expect(result).toMatchObject({ notes: 'updated' });
    });

    it('should call auditLogsService.logOrderChange with UPDATE action', async () => {
      mockOrdersRepository.findById
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);

      await service.update('order-1', { notes: 'x' }, 'user-1');

      expect(mockAuditLogsService.logOrderChange).toHaveBeenCalledWith(
        'UPDATE',
        'order-1',
        mockOrder,
        expect.anything(),
        'user-1',
      );
    });
  });

  // ─────────────────────────────────────────────
  // update — transaction path (with items)
  // ─────────────────────────────────────────────
  describe('update (with items — transaction path)', () => {
    const existingItem = { id: 'item-1' };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      // tx.order.update used inside recalculateOrderTotals
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      // tx.orderItem.findMany returns current DB items
      mockPrisma.orderItem.findMany.mockResolvedValue([existingItem]);
      // tx.orderItem.findFirst for sortOrder lookup
      mockPrisma.orderItem.findFirst.mockResolvedValue(null);
      // aggregate queries inside recalculate
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
    });

    it('should execute update inside a prisma.$transaction', async () => {
      await service.update(
        'order-1',
        { items: [{ id: 'item-1', description: 'Updated', quantity: 1, unitPrice: 50 }] },
        'user-1',
      );

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should delete items that are not present in the incoming list', async () => {
      // DB has item-1 and item-2, incoming only has item-1 → item-2 should be deleted
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([
        { id: 'item-1' },
        { id: 'item-2' },
      ]);

      await service.update(
        'order-1',
        { items: [{ id: 'item-1', description: 'A', quantity: 1, unitPrice: 10 }] },
        'user-1',
      );

      expect(mockPrisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-2'] } },
      });
    });

    it('should create new items that have no existing id in the database', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([{ id: 'item-1' }]);

      await service.update(
        'order-1',
        {
          items: [
            { id: 'item-1', description: 'Existing', quantity: 1, unitPrice: 10 },
            { description: 'New item', quantity: 2, unitPrice: 20 }, // no id → create
          ],
        },
        'user-1',
      );

      expect(mockPrisma.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'New item', orderId: 'order-1' }),
        }),
      );
    });

    it('should update existing items when id matches a current DB item', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([{ id: 'item-1' }]);

      await service.update(
        'order-1',
        { items: [{ id: 'item-1', description: 'Updated A', quantity: 3, unitPrice: 15 }] },
        'user-1',
      );

      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({ description: 'Updated A' }),
        }),
      );
    });

    it('should update existing payment when initialPayment is provided and payment exists', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([]);
      const existingPayment = { id: 'pay-1' };
      mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);

      await service.update(
        'order-1',
        {
          items: [],
          initialPayment: { amount: 60, paymentMethod: PaymentMethod.TRANSFER },
        },
        'user-1',
      );

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-1' } }),
      );
    });

    it('should create payment when no existing payment and initialPayment is given', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValueOnce([]);
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await service.update(
        'order-1',
        {
          items: [],
          initialPayment: { amount: 60, paymentMethod: PaymentMethod.TRANSFER },
        },
        'user-1',
      );

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderId: 'order-1' }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // updateStatus
  // ─────────────────────────────────────────────
  describe('updateStatus', () => {
    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);
      mockOrdersRepository.updateStatus.mockResolvedValue({
        ...mockConfirmedOrder,
        status: OrderStatus.IN_PRODUCTION,
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus('bad-id', OrderStatus.CONFIRMED, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reverting a processed order back to DRAFT', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      await expect(
        service.updateStatus('order-1', OrderStatus.DRAFT, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('order-1', OrderStatus.DRAFT, 'user-1'),
      ).rejects.toThrow('No se puede revertir el estado de la orden a BORRADOR');
    });

    it('should throw BadRequestException when changing to PAID with positive balance', async () => {
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ status: OrderStatus.CONFIRMED, balance: new Prisma.Decimal('50.00') }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.PAID, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('order-1', OrderStatus.PAID, 'user-1'),
      ).rejects.toThrow('PAGADA');
    });

    it('should throw BadRequestException when changing to DELIVERED with positive balance', async () => {
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ status: OrderStatus.READY, balance: new Prisma.Decimal('10.00') }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED, 'user-1'),
      ).rejects.toThrow('ENTREGADA');
    });

    it('should throw ForbiddenException when DELIVERED_ON_CREDIT requires authorization and no approval exists', async () => {
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ status: OrderStatus.READY, balance: new Prisma.Decimal('0.00') }),
      );
      mockStatusChangeRequestsService.requiresAuthorization.mockResolvedValue({
        required: true,
        reason: 'Balance pendiente',
      });
      mockStatusChangeRequestsService.hasApprovedRequest.mockResolvedValue(false);

      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED_ON_CREDIT, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateStatus('order-1', OrderStatus.DELIVERED_ON_CREDIT, 'user-1'),
      ).rejects.toThrow('requiere autorización');
    });

    it('should consume approved request and update status when DELIVERED_ON_CREDIT is authorized', async () => {
      mockOrdersRepository.findById
        .mockResolvedValueOnce(buildOrder({ status: OrderStatus.READY }))
        .mockResolvedValueOnce(buildOrder({ status: OrderStatus.DELIVERED_ON_CREDIT }));
      mockStatusChangeRequestsService.requiresAuthorization.mockResolvedValue({
        required: true,
        reason: 'reason',
      });
      mockStatusChangeRequestsService.hasApprovedRequest.mockResolvedValue(true);
      mockStatusChangeRequestsService.consumeApprovedRequest.mockResolvedValue(undefined);
      mockOrdersRepository.updateStatus.mockResolvedValue(
        buildOrder({ status: OrderStatus.DELIVERED_ON_CREDIT }),
      );

      await service.updateStatus('order-1', OrderStatus.DELIVERED_ON_CREDIT, 'user-1');

      expect(mockStatusChangeRequestsService.consumeApprovedRequest).toHaveBeenCalledWith(
        'order-1',
        'user-1',
        OrderStatus.DELIVERED_ON_CREDIT,
      );
      expect(mockOrdersRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.DELIVERED_ON_CREDIT,
      );
    });

    it('should update status successfully and return the updated order', async () => {
      const updated = buildOrder({ status: OrderStatus.IN_PRODUCTION });
      mockOrdersRepository.findById
        .mockResolvedValueOnce(mockConfirmedOrder)
        .mockResolvedValueOnce(updated);
      mockOrdersRepository.updateStatus.mockResolvedValue(updated);

      const result = await service.updateStatus('order-1', OrderStatus.IN_PRODUCTION, 'user-1');

      expect(result.status).toBe(OrderStatus.IN_PRODUCTION);
      expect(mockOrdersRepository.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.IN_PRODUCTION);
    });

    it('should return order unchanged when new status equals current status', async () => {
      // CONFIRMED → CONFIRMED: no-op
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      const result = await service.updateStatus('order-1', OrderStatus.CONFIRMED, 'user-1');

      expect(mockOrdersRepository.updateStatus).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: OrderStatus.CONFIRMED });
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not in DRAFT status', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      await expect(service.remove('order-1', 'user-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('order-1', 'user-1')).rejects.toThrow(
        'Only DRAFT orders can be deleted',
      );
    });

    it('should delete order and return success message for DRAFT orders', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.delete.mockResolvedValue({});

      const result = await service.remove('order-1', 'user-1');

      expect(mockOrdersRepository.delete).toHaveBeenCalledWith('order-1');
      expect(result).toEqual({ message: 'Order deleted successfully' });
    });

    it('should call auditLogsService.logOrderChange with DELETE action', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.delete.mockResolvedValue({});

      await service.remove('order-1', 'user-1');

      expect(mockAuditLogsService.logOrderChange).toHaveBeenCalledWith(
        'DELETE',
        'order-1',
        mockOrder,
        null,
        'user-1',
      );
    });
  });

  // ─────────────────────────────────────────────
  // registerElectronicInvoice
  // ─────────────────────────────────────────────
  describe('registerElectronicInvoice', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(
        service.registerElectronicInvoice('bad-id', 'FE-001', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order has no IVA (tax == 0)', async () => {
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ tax: new Prisma.Decimal('0.00') }),
      );

      await expect(
        service.registerElectronicInvoice('order-1', 'FE-001', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.registerElectronicInvoice('order-1', 'FE-001', 'user-1'),
      ).rejects.toThrow('solo aplica para órdenes que incluyan IVA');
    });

    it('should throw BadRequestException when order is in DRAFT status', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder); // DRAFT with tax 19

      await expect(
        service.registerElectronicInvoice('order-1', 'FE-001', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.registerElectronicInvoice('order-1', 'FE-001', 'user-1'),
      ).rejects.toThrow('estado BORRADOR');
    });

    it('should register invoice number and return updated order', async () => {
      const confirmedOrderWithTax = buildOrder({
        status: OrderStatus.CONFIRMED,
        tax: new Prisma.Decimal('19.00'),
      });
      const updatedOrder = { ...confirmedOrderWithTax, electronicInvoiceNumber: 'FE-001' };

      mockOrdersRepository.findById.mockResolvedValue(confirmedOrderWithTax);
      mockOrdersRepository.registerElectronicInvoice.mockResolvedValue(updatedOrder);

      const result = await service.registerElectronicInvoice('order-1', 'FE-001', 'user-1');

      expect(mockOrdersRepository.registerElectronicInvoice).toHaveBeenCalledWith(
        'order-1',
        'FE-001',
      );
      expect(result.electronicInvoiceNumber).toBe('FE-001');
    });
  });

  // ─────────────────────────────────────────────
  // addItem
  // ─────────────────────────────────────────────
  describe('addItem', () => {
    const addItemDto = {
      description: 'New item',
      quantity: 2,
      unitPrice: 30,
    };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      // Inside the transaction: findFirst for sortOrder, create item, recalculate
      mockPrisma.orderItem.findFirst.mockResolvedValue({ sortOrder: 1 });
      mockPrisma.orderItem.create.mockResolvedValue({ id: 'item-new' });
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
      mockPrisma.order.update.mockResolvedValue(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.addItem('bad-id', addItemDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not in DRAFT', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      await expect(service.addItem('order-1', addItemDto)).rejects.toThrow(BadRequestException);
      await expect(service.addItem('order-1', addItemDto)).rejects.toThrow(
        'Items can only be added to DRAFT orders',
      );
    });

    it('should create item inside a transaction and trigger total recalculation', async () => {
      await service.addItem('order-1', addItemDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            description: 'New item',
            quantity: 2,
          }),
        }),
      );
    });

    it('should assign sortOrder = lastItem.sortOrder + 1 when a previous item exists', async () => {
      mockPrisma.orderItem.findFirst.mockResolvedValue({ sortOrder: 3 });

      await service.addItem('order-1', addItemDto);

      const createCall = mockPrisma.orderItem.create.mock.calls[0][0];
      expect(createCall.data.sortOrder).toBe(4);
    });

    it('should assign sortOrder = 1 when no previous item exists', async () => {
      mockPrisma.orderItem.findFirst.mockResolvedValue(null);

      await service.addItem('order-1', addItemDto);

      const createCall = mockPrisma.orderItem.create.mock.calls[0][0];
      expect(createCall.data.sortOrder).toBe(1);
    });
  });

  // ─────────────────────────────────────────────
  // updateItem
  // ─────────────────────────────────────────────
  describe('updateItem', () => {
    const mockItem = { id: 'item-1', orderId: 'order-1', quantity: 2, unitPrice: 50 };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.findItemById.mockResolvedValue(mockItem);
      mockPrisma.orderItem.update.mockResolvedValue(mockItem);
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
      mockPrisma.order.update.mockResolvedValue(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.updateItem('bad-id', 'item-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not in DRAFT', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      await expect(service.updateItem('order-1', 'item-1', {})).rejects.toThrow(BadRequestException);
      await expect(service.updateItem('order-1', 'item-1', {})).rejects.toThrow(
        'Items can only be modified in DRAFT orders',
      );
    });

    it('should throw NotFoundException when item does not belong to the order', async () => {
      mockOrdersRepository.findItemById.mockResolvedValue({
        id: 'item-1',
        orderId: 'other-order',
      });

      await expect(service.updateItem('order-1', 'item-1', {})).rejects.toThrow(NotFoundException);
      await expect(service.updateItem('order-1', 'item-1', {})).rejects.toThrow(
        'Item not found in this order',
      );
    });

    it('should recalculate item total when quantity changes', async () => {
      await service.updateItem('order-1', 'item-1', { quantity: 5 });

      const updateCall = mockPrisma.orderItem.update.mock.calls[0][0];
      // quantity=5, unitPrice=50 (from item) → total = 250
      expect(updateCall.data.total.toString()).toBe('250');
    });

    it('should update item and recalculate order totals inside a transaction', async () => {
      await service.updateItem('order-1', 'item-1', { description: 'Updated' });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-1' } }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // removeItem
  // ─────────────────────────────────────────────
  describe('removeItem', () => {
    const mockItem = { id: 'item-1', orderId: 'order-1' };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ items: [{ id: 'item-1' }, { id: 'item-2' }] }),
      );
      mockOrdersRepository.findItemById.mockResolvedValue(mockItem);
      mockPrisma.orderItem.delete.mockResolvedValue({});
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
      mockPrisma.order.update.mockResolvedValue(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.removeItem('bad-id', 'item-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not in DRAFT', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);

      await expect(service.removeItem('order-1', 'item-1')).rejects.toThrow(BadRequestException);
      await expect(service.removeItem('order-1', 'item-1')).rejects.toThrow(
        'Items can only be removed from DRAFT orders',
      );
    });

    it('should throw NotFoundException when item does not belong to the order', async () => {
      mockOrdersRepository.findItemById.mockResolvedValue({
        id: 'item-1',
        orderId: 'other-order',
      });

      await expect(service.removeItem('order-1', 'item-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to remove the last item', async () => {
      // Order with only 1 item
      mockOrdersRepository.findById.mockResolvedValue(
        buildOrder({ items: [{ id: 'item-1' }] }),
      );

      await expect(service.removeItem('order-1', 'item-1')).rejects.toThrow(BadRequestException);
      await expect(service.removeItem('order-1', 'item-1')).rejects.toThrow(
        'Order must have at least one item',
      );
    });

    it('should delete item and recalculate order totals inside a transaction', async () => {
      await service.removeItem('order-1', 'item-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  // ─────────────────────────────────────────────
  // addPayment
  // ─────────────────────────────────────────────
  describe('addPayment', () => {
    const paymentDto = {
      amount: 50,
      paymentMethod: PaymentMethod.CASH,
    };
    const mockPaymentFull = {
      id: 'pay-new',
      amount: new Prisma.Decimal('50.00'),
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date(),
      reference: null,
      notes: null,
      receiptFileId: null,
      createdAt: new Date(),
      receivedBy: { id: 'user-1', email: 'u@e.com', firstName: 'A', lastName: 'B' },
    };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-new' });
      mockPrisma.order.update.mockResolvedValue(mockConfirmedOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(mockPaymentFull);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.addPayment('bad-id', paymentDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order status is DRAFT', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder); // DRAFT

      await expect(service.addPayment('order-1', paymentDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addPayment('order-1', paymentDto, 'user-1')).rejects.toThrow(
        'Payments can only be added to CONFIRMED or later status orders',
      );
    });

    it('should throw BadRequestException when payment amount exceeds order balance', async () => {
      // Balance = 119, payment = 200
      await expect(
        service.addPayment('order-1', { amount: 200, paymentMethod: PaymentMethod.CASH }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addPayment('order-1', { amount: 200, paymentMethod: PaymentMethod.CASH }, 'user-1'),
      ).rejects.toThrow('cannot exceed order balance');
    });

    it('should create payment inside a transaction and update paidAmount and balance', async () => {
      await service.addPayment('order-1', paymentDto, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            receivedById: 'user-1',
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            paidAmount: expect.anything(),
            balance: expect.anything(),
          }),
        }),
      );
    });

    it('should return full payment object via prisma.payment.findUnique', async () => {
      const result = await service.addPayment('order-1', paymentDto, 'user-1');

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-new' } }),
      );
      expect(result).toMatchObject({ id: 'pay-new', paymentMethod: PaymentMethod.CASH });
    });
  });

  // ─────────────────────────────────────────────
  // getPayments
  // ─────────────────────────────────────────────
  describe('getPayments', () => {
    it('should verify order exists and return payments from repository', async () => {
      const mockPayments = [{ id: 'pay-1' }];
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.findPaymentsByOrderId.mockResolvedValue(mockPayments);

      const result = await service.getPayments('order-1');

      expect(mockOrdersRepository.findById).toHaveBeenCalledWith('order-1');
      expect(mockOrdersRepository.findPaymentsByOrderId).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockPayments);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.getPayments('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────
  // applyDiscount
  // ─────────────────────────────────────────────
  describe('applyDiscount', () => {
    const discountDto = { amount: 10, reason: 'Loyalty discount' };
    const mockDiscountFull = {
      id: 'disc-new',
      amount: new Prisma.Decimal('10.00'),
      reason: 'Loyalty discount',
      appliedAt: new Date(),
      appliedBy: { id: 'user-1', email: 'u@e.com', firstName: 'A', lastName: 'B' },
    };

    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);
      mockPrisma.orderDiscount.create.mockResolvedValue({ id: 'disc-new' });
      // recalculate inside transaction
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
      mockPrisma.order.update.mockResolvedValue(mockConfirmedOrder);
      mockPrisma.orderDiscount.findUnique.mockResolvedValue(mockDiscountFull);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(
        service.applyDiscount('bad-id', discountDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is in DRAFT status', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder); // DRAFT

      await expect(
        service.applyDiscount('order-1', discountDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.applyDiscount('order-1', discountDto, 'user-1'),
      ).rejects.toThrow('solo pueden aplicarse a órdenes CONFIRMADAS');
    });

    it('should throw BadRequestException when new total discount would exceed subtotal + tax', async () => {
      // subtotal=100, tax=19 → baseTotal=119
      // existing discountAmount=110, new discount=20 → newTotal=130 > 119
      const almostMaxDiscountOrder = buildOrder({
        status: OrderStatus.CONFIRMED,
        discountAmount: new Prisma.Decimal('110.00'),
      });
      mockOrdersRepository.findById.mockResolvedValue(almostMaxDiscountOrder);

      await expect(
        service.applyDiscount('order-1', { amount: 20, reason: 'Too much' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.applyDiscount('order-1', { amount: 20, reason: 'Too much' }, 'user-1'),
      ).rejects.toThrow('no puede exceder');
    });

    it('should create discount inside a transaction and return full discount object', async () => {
      const result = await service.applyDiscount('order-1', discountDto, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderDiscount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            reason: 'Loyalty discount',
            appliedById: 'user-1',
          }),
        }),
      );
      expect(mockPrisma.orderDiscount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'disc-new' } }),
      );
      expect(result).toMatchObject({ id: 'disc-new', reason: 'Loyalty discount' });
    });
  });

  // ─────────────────────────────────────────────
  // removeDiscount
  // ─────────────────────────────────────────────
  describe('removeDiscount', () => {
    beforeEach(() => {
      mockOrdersRepository.findById.mockResolvedValue(mockConfirmedOrder);
      mockPrisma.orderDiscount.findFirst.mockResolvedValue({ id: 'disc-1', orderId: 'order-1' });
      mockPrisma.orderDiscount.delete.mockResolvedValue({});
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.orderDiscount.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue({ taxRate: new Prisma.Decimal('0.19') });
      mockPrisma.order.update.mockResolvedValue(mockConfirmedOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.removeDiscount('bad-id', 'disc-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is in DRAFT status', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder); // DRAFT

      await expect(service.removeDiscount('order-1', 'disc-1')).rejects.toThrow(BadRequestException);
      await expect(service.removeDiscount('order-1', 'disc-1')).rejects.toThrow(
        'solo pueden eliminarse de órdenes CONFIRMADAS',
      );
    });

    it('should throw NotFoundException when discount does not belong to the order', async () => {
      mockPrisma.orderDiscount.findFirst.mockResolvedValue(null);

      await expect(service.removeDiscount('order-1', 'bad-disc')).rejects.toThrow(NotFoundException);
      await expect(service.removeDiscount('order-1', 'bad-disc')).rejects.toThrow(
        'no encontrado para la orden',
      );
    });

    it('should delete discount and recalculate order totals inside a transaction', async () => {
      await service.removeDiscount('order-1', 'disc-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderDiscount.delete).toHaveBeenCalledWith({
        where: { id: 'disc-1' },
      });
    });
  });

  // ─────────────────────────────────────────────
  // getDiscounts
  // ─────────────────────────────────────────────
  describe('getDiscounts', () => {
    it('should verify order exists and return discounts from repository', async () => {
      const mockDiscounts = [{ id: 'disc-1' }];
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      mockOrdersRepository.findDiscountsByOrderId.mockResolvedValue(mockDiscounts);

      const result = await service.getDiscounts('order-1');

      expect(mockOrdersRepository.findById).toHaveBeenCalledWith('order-1');
      expect(mockOrdersRepository.findDiscountsByOrderId).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(mockDiscounts);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.getDiscounts('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
