import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // logCreate
  // ---------------------------------------------------------------------------
  describe('logCreate', () => {
    it('should call prisma.auditLog.create with action=CREATE and model/recordId/newData', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logCreate('User', 'user-1', { name: 'John' }, 'actor-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'CREATE',
          model: 'User',
          recordId: 'user-1',
          newData: { name: 'John' },
          userId: 'actor-1',
        },
      });
    });

    it('should set userId=null when userId is not provided', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logCreate('User', 'user-1', { name: 'John' });

      const callArg = prisma.auditLog.create.mock.calls[0][0];
      expect(callArg.data.userId).toBeNull();
    });

    it('should NOT throw when prisma.auditLog.create rejects (swallows error)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logCreate('User', 'user-1', {}),
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // logUpdate
  // ---------------------------------------------------------------------------
  describe('logUpdate', () => {
    it('should call prisma.auditLog.create with action=UPDATE, oldData and newData', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.logUpdate(
        'Order',
        'order-1',
        { status: 'DRAFT' },
        { status: 'CONFIRMED' },
        'actor-1',
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'UPDATE',
          model: 'Order',
          recordId: 'order-1',
          oldData: { status: 'DRAFT' },
          newData: { status: 'CONFIRMED' },
          userId: 'actor-1',
        },
      });
    });

    it('should set userId=null when not provided', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.logUpdate('Order', 'order-1', {}, {});

      expect(prisma.auditLog.create.mock.calls[0][0].data.userId).toBeNull();
    });

    it('should NOT throw when prisma.auditLog.create rejects', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logUpdate('Order', 'order-1', {}, {}),
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // logDelete
  // ---------------------------------------------------------------------------
  describe('logDelete', () => {
    it('should call prisma.auditLog.create with action=DELETE and oldData', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-3' });

      await service.logDelete(
        'Permission',
        'perm-1',
        { name: 'read_users' },
        'actor-1',
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'DELETE',
          model: 'Permission',
          recordId: 'perm-1',
          oldData: { name: 'read_users' },
          userId: 'actor-1',
        },
      });
    });

    it('should set userId=null when not provided', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-3' });

      await service.logDelete('Permission', 'perm-1', {});

      expect(prisma.auditLog.create.mock.calls[0][0].data.userId).toBeNull();
    });

    it('should NOT throw when prisma.auditLog.create rejects', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logDelete('Permission', 'perm-1', {}),
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // logOrderChange  (fire-and-forget via setImmediate)
  // ---------------------------------------------------------------------------
  describe('logOrderChange', () => {
    // Helper: flush setImmediate queue so the callback runs before assertions
    const flushSetImmediate = () =>
      new Promise<void>((resolve) => setImmediate(resolve));

    const mockOrder = {
      orderNumber: 'OP-2026-001',
      status: 'CONFIRMED',
      subtotal: { toString: () => '100' },
      tax: { toString: () => '19' },
      total: { toString: () => '119' },
      paidAmount: { toString: () => '0' },
      balance: { toString: () => '119' },
      items: [{ id: 'item-1' }],
      payments: [],
      notes: 'Test note',
    };

    it('should create an audit log with model=Order and the provided action', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await service.logOrderChange('CREATE', 'order-1', null, mockOrder, 'actor-1');
      await flushSetImmediate();

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            model: 'Order',
            recordId: 'order-1',
          }),
        }),
      );
    });

    it('should simplify oldData into a summary object (orderNumber, status, counts)', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await service.logOrderChange('UPDATE', 'order-1', mockOrder, mockOrder, 'actor-1');
      await flushSetImmediate();

      const callData = prisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.oldData).toMatchObject({
        orderNumber: 'OP-2026-001',
        status: 'CONFIRMED',
        subtotal: '100',
        itemsCount: 1,
        paymentsCount: 0,
        notes: 'Test note',
      });
    });

    it('should set oldData=null when oldData argument is null', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await service.logOrderChange('CREATE', 'order-1', null, mockOrder);
      await flushSetImmediate();

      const callData = prisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.oldData).toBeNull();
    });

    it('should set userId=null when not provided', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await service.logOrderChange('CREATE', 'order-1', null, mockOrder);
      await flushSetImmediate();

      const callData = prisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.userId).toBeNull();
    });

    it('should return immediately (fire-and-forget) without waiting for DB', async () => {
      // The DB call is deliberately slow
      prisma.auditLog.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000)),
      );

      // logOrderChange should return before DB resolves
      const result = await service.logOrderChange(
        'UPDATE',
        'order-1',
        null,
        mockOrder,
      );

      // Returns undefined immediately (void)
      expect(result).toBeUndefined();
      // prisma.auditLog.create hasn't been called yet
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should NOT throw even if prisma.auditLog.create rejects inside setImmediate', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB crash'));

      await service.logOrderChange('DELETE', 'order-1', mockOrder, null);
      // Flush setImmediate — should not throw
      await expect(flushSetImmediate()).resolves.not.toThrow();
    });
  });
});
