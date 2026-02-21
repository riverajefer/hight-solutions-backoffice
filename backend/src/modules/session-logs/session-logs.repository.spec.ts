import { Test, TestingModule } from '@nestjs/testing';
import { SessionLogsRepository } from './session-logs.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

const mockLog = {
  id: 'log-1',
  userId: 'user-1',
  loginAt: new Date('2026-01-15T08:00:00Z'),
  logoutAt: null,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  user: {
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'John',
    lastName: 'Doe',
    cargo: { id: 'cargo-1', name: 'Operario', area: { id: 'area-1', name: 'Producción' } },
  },
};

describe('SessionLogsRepository', () => {
  let repository: SessionLogsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionLogsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<SessionLogsRepository>(SessionLogsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // createLoginLog
  // -------------------------------------------------------------------------
  describe('createLoginLog', () => {
    it('should create a session log with userId, loginAt, ipAddress and userAgent', async () => {
      prisma.sessionLog.create.mockResolvedValue(mockLog);

      await repository.createLoginLog('user-1', '192.168.1.1', 'Mozilla/5.0');

      expect(prisma.sessionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        }),
      );
    });

    it('should work without ipAddress and userAgent', async () => {
      prisma.sessionLog.create.mockResolvedValue(mockLog);

      await repository.createLoginLog('user-1');

      expect(prisma.sessionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateLogoutLog
  // -------------------------------------------------------------------------
  describe('updateLogoutLog', () => {
    it('should update the active session with logoutAt', async () => {
      const activeSession = { ...mockLog };
      prisma.sessionLog.findFirst.mockResolvedValue(activeSession);
      prisma.sessionLog.update.mockResolvedValue({ ...mockLog, logoutAt: new Date() });

      await repository.updateLogoutLog('user-1');

      expect(prisma.sessionLog.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', logoutAt: null },
        orderBy: { loginAt: 'desc' },
      });
      expect(prisma.sessionLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1' },
          data: expect.objectContaining({ logoutAt: expect.any(Date) }),
        }),
      );
    });

    it('should return null when there is no active session', async () => {
      prisma.sessionLog.findFirst.mockResolvedValue(null);

      const result = await repository.updateLogoutLog('user-1');

      expect(result).toBeNull();
      expect(prisma.sessionLog.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should call findMany and count with empty where by default', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([mockLog]);
      prisma.sessionLog.count.mockResolvedValue(1);

      await repository.findAll({});

      expect(prisma.sessionLog.findMany).toHaveBeenCalled();
      expect(prisma.sessionLog.count).toHaveBeenCalled();
    });

    it('should filter by userId when provided', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([mockLog]);
      prisma.sessionLog.count.mockResolvedValue(1);

      await repository.findAll({ userId: 'user-1' } as any);

      const callArg = prisma.sessionLog.findMany.mock.calls[0][0];
      expect(callArg.where.userId).toBe('user-1');
    });

    it('should filter by startDate when provided', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([]);
      prisma.sessionLog.count.mockResolvedValue(0);

      await repository.findAll({ startDate: '2026-01-01' } as any);

      const callArg = prisma.sessionLog.findMany.mock.calls[0][0];
      expect(callArg.where.loginAt?.gte).toBeInstanceOf(Date);
    });

    it('should filter by endDate when provided', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([]);
      prisma.sessionLog.count.mockResolvedValue(0);

      await repository.findAll({ endDate: '2026-01-31' } as any);

      const callArg = prisma.sessionLog.findMany.mock.calls[0][0];
      expect(callArg.where.loginAt?.lte).toBeInstanceOf(Date);
    });

    it('should apply pagination with skip and take', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([]);
      prisma.sessionLog.count.mockResolvedValue(0);

      await repository.findAll({ page: 3, limit: 5 } as any);

      const callArg = prisma.sessionLog.findMany.mock.calls[0][0];
      expect(callArg.skip).toBe(10); // (3-1) * 5
      expect(callArg.take).toBe(5);
    });

    it('should return paginated meta with totalPages', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([mockLog]);
      prisma.sessionLog.count.mockResolvedValue(25);

      const result = await repository.findAll({ page: 1, limit: 10 } as any);

      expect(result.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByUserId
  // -------------------------------------------------------------------------
  describe('findByUserId', () => {
    it('should filter by userId and apply default pagination', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([mockLog]);
      prisma.sessionLog.count.mockResolvedValue(1);

      const result = await repository.findByUserId('user-1');

      expect(prisma.sessionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result.meta.total).toBe(1);
    });

    it('should apply custom page and limit', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([]);
      prisma.sessionLog.count.mockResolvedValue(0);

      await repository.findByUserId('user-1', 2, 5);

      const callArg = prisma.sessionLog.findMany.mock.calls[0][0];
      expect(callArg.skip).toBe(5); // (2-1) * 5
      expect(callArg.take).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // getActiveSessions
  // -------------------------------------------------------------------------
  describe('getActiveSessions', () => {
    it('should filter by logoutAt: null and order by loginAt desc', async () => {
      prisma.sessionLog.findMany.mockResolvedValue([mockLog]);

      const result = await repository.getActiveSessions();

      expect(prisma.sessionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { logoutAt: null },
          orderBy: { loginAt: 'desc' },
        }),
      );
      expect(result).toEqual([mockLog]);
    });
  });
});
