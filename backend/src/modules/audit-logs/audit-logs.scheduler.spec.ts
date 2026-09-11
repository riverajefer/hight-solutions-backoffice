import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditLogsScheduler } from './audit-logs.scheduler';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsScheduler', () => {
  let scheduler: AuditLogsScheduler;

  const mockService = {
    purgeExpiredLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsScheduler,
        { provide: AuditLogsService, useValue: mockService },
      ],
    }).compile();

    scheduler = module.get<AuditLogsScheduler>(AuditLogsScheduler);

    // Silenciar el logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  describe('purgeExpiredAuditLogs', () => {
    it('logs how many records it purged', async () => {
      mockService.purgeExpiredLogs.mockResolvedValue(12);

      await scheduler.purgeExpiredAuditLogs();

      expect(mockService.purgeExpiredLogs).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Se eliminaron 12 registro(s)'),
      );
    });

    it('stays quiet when there was nothing to purge', async () => {
      mockService.purgeExpiredLogs.mockResolvedValue(0);

      await scheduler.purgeExpiredAuditLogs();

      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('logs the error instead of throwing', async () => {
      mockService.purgeExpiredLogs.mockRejectedValue(new Error('db down'));

      await expect(scheduler.purgeExpiredAuditLogs()).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        '[Retención] Error al purgar registros de auditoría',
        expect.any(Error),
      );
    });
  });
});
