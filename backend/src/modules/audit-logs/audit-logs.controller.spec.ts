import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@example.com',
};

const mockLog = {
  id: 'log-1',
  userId: 'user-1',
  action: 'CREATE',
  model: 'Order',
  recordId: 'order-1',
  oldData: null,
  newData: { status: 'DRAFT' },
  createdAt: new Date('2026-01-01'),
};

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);

    // Defaults
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockLog]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(1);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated logs with user data', async () => {
      const result = await controller.findAll('1', '10');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.auditLog.count).toHaveBeenCalled();
      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should calculate correct skip for page 3 with limit 10', async () => {
      await controller.findAll('3', '10');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should apply userId filter when provided', async () => {
      await controller.findAll('1', '10', 'user-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should apply action filter when provided', async () => {
      await controller.findAll('1', '10', undefined, 'CREATE');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'CREATE' }),
        }),
      );
    });

    it('should apply model filter when provided', async () => {
      await controller.findAll('1', '10', undefined, undefined, 'Order');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ model: 'Order' }),
        }),
      );
    });

    it('should apply date range filter with gte and lte when both dates provided', async () => {
      await controller.findAll('1', '10', undefined, undefined, undefined, '2026-01-01', '2026-01-31');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should enrich logs with user data from usersMap', async () => {
      const result = await controller.findAll('1', '10');

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result.data[0]).toHaveProperty('user');
      expect(result.data[0].user).toMatchObject({ id: 'user-1' });
    });

    it('should set user to null for logs without userId', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { ...mockLog, userId: null },
      ]);

      const result = await controller.findAll('1', '10');

      expect(result.data[0].user).toBeNull();
    });
  });

  // ─────────────────────────────────────────
  // getAuditLogsByUser
  // ─────────────────────────────────────────
  describe('getAuditLogsByUser', () => {
    it('should return logs with user info enriched', async () => {
      const result = await controller.getAuditLogsByUser('user-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result[0]).toHaveProperty('user');
      expect(result[0].user).toMatchObject({ id: 'user-1' });
    });

    it('should return all logs limited to 100', async () => {
      await controller.getAuditLogsByUser('user-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  // ─────────────────────────────────────────
  // getAuditLogsByModel
  // ─────────────────────────────────────────
  describe('getAuditLogsByModel', () => {
    it('should filter logs by model and enrich with user data', async () => {
      const result = await controller.getAuditLogsByModel('Order');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { model: 'Order' }, take: 100 }),
      );
      expect(result[0]).toHaveProperty('user');
    });

    it('should set user to null for logs with no userId', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { ...mockLog, userId: null },
      ]);

      const result = await controller.getAuditLogsByModel('Order');

      expect(result[0].user).toBeNull();
    });
  });

  // ─────────────────────────────────────────
  // getRecordHistory
  // ─────────────────────────────────────────
  describe('getRecordHistory', () => {
    const rawLog = {
      id: 'log-1',
      user_id: 'user-1',
      action: 'CREATE',
      model: 'Order',
      record_id: 'order-1',
      old_data: null,
      new_data: { status: 'DRAFT' },
      changed_fields: null,
      ip_address: null,
      user_agent: null,
      metadata: null,
      created_at: new Date('2026-01-01'),
    };

    beforeEach(() => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([rawLog]);
    });

    it('should use raw query and normalize column names', async () => {
      const result = await controller.getRecordHistory('order-1');

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('userId', 'user-1');
      expect(result[0]).toHaveProperty('recordId', 'order-1');
      expect(result[0]).toHaveProperty('createdAt');
    });

    it('should enrich normalized logs with user data', async () => {
      const result = await controller.getRecordHistory('order-1');

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('user');
      expect(result[0].user).toMatchObject({ id: 'user-1' });
    });

    it('should return empty array when no logs found for record', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await controller.getRecordHistory('unknown-id');

      expect(result).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────
  // getLatestAuditLogs
  // ─────────────────────────────────────────
  describe('getLatestAuditLogs', () => {
    it('should fetch last 50 logs and enrich with user data', async () => {
      const result = await controller.getLatestAuditLogs();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
      expect(result[0]).toHaveProperty('user');
    });
  });
});
