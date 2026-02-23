import { Test, TestingModule } from '@nestjs/testing';
import { SessionLogsController } from './session-logs.controller';
import { SessionLogsService } from './session-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockSessionLogsService = {
  findAll: jest.fn(),
  findByUserId: jest.fn(),
  getActiveSessions: jest.fn(),
};

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  loginAt: new Date('2026-01-01T09:00:00Z'),
  logoutAt: new Date('2026-01-01T09:30:00Z'),
  durationMinutes: 30,
  durationFormatted: '30m',
};

describe('SessionLogsController', () => {
  let controller: SessionLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionLogsController],
      providers: [{ provide: SessionLogsService, useValue: mockSessionLogsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SessionLogsController>(SessionLogsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate to sessionLogsService.findAll with filters', async () => {
      const filters = { page: 1, limit: 10 } as any;
      mockSessionLogsService.findAll.mockResolvedValue({
        data: [mockSession],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await controller.findAll(filters);

      expect(mockSessionLogsService.findAll).toHaveBeenCalledWith(filters);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByUser', () => {
    it('should delegate to sessionLogsService.findByUserId with userId and parsed pagination', async () => {
      mockSessionLogsService.findByUserId.mockResolvedValue({
        data: [mockSession],
        meta: { total: 1, page: 2, limit: 5, totalPages: 1 },
      });

      const result = await controller.findByUser('user-1', 2, 5);

      expect(mockSessionLogsService.findByUserId).toHaveBeenCalledWith('user-1', 2, 5);
      expect(result.data).toHaveLength(1);
    });

    it('should use default pagination (page=1, limit=10) when params are undefined', async () => {
      mockSessionLogsService.findByUserId.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await controller.findByUser('user-1', undefined, undefined);

      expect(mockSessionLogsService.findByUserId).toHaveBeenCalledWith('user-1', 1, 10);
    });
  });

  describe('getActiveSessions', () => {
    it('should delegate to sessionLogsService.getActiveSessions', async () => {
      const activeSession = { ...mockSession, logoutAt: null, durationFormatted: 'Sesión activa' };
      mockSessionLogsService.getActiveSessions.mockResolvedValue([activeSession]);

      const result = await controller.getActiveSessions();

      expect(mockSessionLogsService.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].logoutAt).toBeNull();
    });
  });
});
