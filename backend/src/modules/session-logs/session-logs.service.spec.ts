import { Test, TestingModule } from '@nestjs/testing';
import { SessionLogsService } from './session-logs.service';
import { SessionLogsRepository } from './session-logs.repository';

const mockSessionLogsRepository = {
  createLoginLog: jest.fn(),
  updateLogoutLog: jest.fn(),
  findAll: jest.fn(),
  findByUserId: jest.fn(),
  getActiveSessions: jest.fn(),
};

describe('SessionLogsService', () => {
  let service: SessionLogsService;

  // Helper: crea una fecha X minutos atrás desde ahora
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60 * 1000);

  // Helper: crea una fecha específica
  const at = (h: number, m: number) => {
    const d = new Date('2025-01-01T00:00:00Z');
    d.setUTCHours(h, m, 0, 0);
    return d;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionLogsService,
        { provide: SessionLogsRepository, useValue: mockSessionLogsRepository },
      ],
    }).compile();

    service = module.get<SessionLogsService>(SessionLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // createLoginLog
  // ─────────────────────────────────────────────
  describe('createLoginLog', () => {
    it('should delegate to sessionLogsRepository.createLoginLog', async () => {
      mockSessionLogsRepository.createLoginLog.mockResolvedValue({ id: 'log-1' });

      await service.createLoginLog('user-1', '127.0.0.1', 'Mozilla');

      expect(mockSessionLogsRepository.createLoginLog).toHaveBeenCalledWith(
        'user-1',
        '127.0.0.1',
        'Mozilla',
      );
    });

    it('should work without optional ipAddress and userAgent', async () => {
      mockSessionLogsRepository.createLoginLog.mockResolvedValue({ id: 'log-1' });

      await service.createLoginLog('user-1');

      expect(mockSessionLogsRepository.createLoginLog).toHaveBeenCalledWith(
        'user-1',
        undefined,
        undefined,
      );
    });
  });

  // ─────────────────────────────────────────────
  // createLogoutLog
  // ─────────────────────────────────────────────
  describe('createLogoutLog', () => {
    it('should delegate to sessionLogsRepository.updateLogoutLog', async () => {
      mockSessionLogsRepository.updateLogoutLog.mockResolvedValue({});

      await service.createLogoutLog('user-1');

      expect(mockSessionLogsRepository.updateLogoutLog).toHaveBeenCalledWith('user-1');
    });
  });

  // ─────────────────────────────────────────────
  // findAll — enrichment con duración
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should enrich sessions with durationMinutes and durationFormatted', async () => {
      const loginAt = at(10, 0);
      const logoutAt = at(10, 90); // 90 minutos después

      mockSessionLogsRepository.findAll.mockResolvedValue({
        data: [{ id: 'log-1', loginAt, logoutAt }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result.data[0].durationMinutes).toBe(90);
      expect(result.data[0].durationFormatted).toBe('1h 30m');
    });

    it('should mark active sessions (logoutAt=null) as "Sesión activa"', async () => {
      mockSessionLogsRepository.findAll.mockResolvedValue({
        data: [{ id: 'log-1', loginAt: minutesAgo(30), logoutAt: null }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result.data[0].durationFormatted).toBe('Sesión activa');
    });

    it('should pass through meta from repository', async () => {
      const meta = { total: 50, page: 2, limit: 10, totalPages: 5 };
      mockSessionLogsRepository.findAll.mockResolvedValue({ data: [], meta });

      const result = await service.findAll({ page: 2, limit: 10 } as any);

      expect(result.meta).toEqual(meta);
    });
  });

  // ─────────────────────────────────────────────
  // findByUserId — enrichment con duración
  // ─────────────────────────────────────────────
  describe('findByUserId', () => {
    it('should enrich sessions with duration data', async () => {
      const loginAt = at(8, 0);
      const logoutAt = at(9, 0); // 60 minutos

      mockSessionLogsRepository.findByUserId.mockResolvedValue({
        data: [{ id: 'log-1', loginAt, logoutAt }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.findByUserId('user-1');

      expect(result.data[0].durationMinutes).toBe(60);
      expect(result.data[0].durationFormatted).toBe('1h');
    });

    it('should pass page and limit defaults to repository', async () => {
      mockSessionLogsRepository.findByUserId.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.findByUserId('user-1');

      expect(mockSessionLogsRepository.findByUserId).toHaveBeenCalledWith('user-1', 1, 10);
    });

    it('should pass custom page and limit to repository', async () => {
      mockSessionLogsRepository.findByUserId.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 3, limit: 5, totalPages: 0 },
      });

      await service.findByUserId('user-1', 3, 5);

      expect(mockSessionLogsRepository.findByUserId).toHaveBeenCalledWith('user-1', 3, 5);
    });
  });

  // ─────────────────────────────────────────────
  // getActiveSessions — enrichment
  // ─────────────────────────────────────────────
  describe('getActiveSessions', () => {
    it('should return active sessions with durationMinutes calculated from login to now', async () => {
      const loginAt = minutesAgo(45);

      mockSessionLogsRepository.getActiveSessions.mockResolvedValue([
        { id: 'log-1', loginAt, logoutAt: null },
      ]);

      const result = await service.getActiveSessions();

      // Tolerancia de ±1 minuto por tiempo de ejecución del test
      expect(result[0].durationMinutes).toBeGreaterThanOrEqual(44);
      expect(result[0].durationMinutes).toBeLessThanOrEqual(46);
    });

    it('should mark all sessions as "Sesión activa"', async () => {
      mockSessionLogsRepository.getActiveSessions.mockResolvedValue([
        { id: 'log-1', loginAt: minutesAgo(10), logoutAt: null },
        { id: 'log-2', loginAt: minutesAgo(5), logoutAt: null },
      ]);

      const result = await service.getActiveSessions();

      expect(result.every((s) => s.durationFormatted === 'Sesión activa')).toBe(true);
    });

    it('should return empty array when no active sessions', async () => {
      mockSessionLogsRepository.getActiveSessions.mockResolvedValue([]);

      const result = await service.getActiveSessions();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // formatDuration — lógica privada (cubierta indirectamente)
  // ─────────────────────────────────────────────
  describe('duration formatting (via findAll)', () => {
    const buildSession = (loginAt: Date, logoutAt: Date | null) => ({
      id: 'log-1',
      loginAt,
      logoutAt,
    });

    const getFormatted = async (loginAt: Date, logoutAt: Date | null) => {
      mockSessionLogsRepository.findAll.mockResolvedValue({
        data: [buildSession(loginAt, logoutAt)],
        meta: {},
      });
      const result = await service.findAll({} as any);
      return result.data[0].durationFormatted;
    };

    it('should format as "< 1m" when duration is less than 1 minute', async () => {
      const loginAt = at(10, 0);
      const logoutAt = new Date(loginAt.getTime() + 30 * 1000); // 30 segundos

      expect(await getFormatted(loginAt, logoutAt)).toBe('< 1m');
    });

    it('should format as "Xm" when duration is less than 1 hour', async () => {
      const loginAt = at(10, 0);
      const logoutAt = at(10, 45); // 45 minutos

      expect(await getFormatted(loginAt, logoutAt)).toBe('45m');
    });

    it('should format as "Xh" when duration is exact hours (no remaining minutes)', async () => {
      const loginAt = at(8, 0);
      const logoutAt = at(10, 0); // 2 horas exactas

      expect(await getFormatted(loginAt, logoutAt)).toBe('2h');
    });

    it('should format as "Xh Ym" when duration has hours and minutes', async () => {
      const loginAt = at(9, 0);
      const logoutAt = at(11, 30); // 2h 30m

      expect(await getFormatted(loginAt, logoutAt)).toBe('2h 30m');
    });

    it('should format as "Sesión activa" when logoutAt is null', async () => {
      expect(await getFormatted(minutesAgo(10), null)).toBe('Sesión activa');
    });
  });
});
