import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceScheduler } from './attendance.scheduler';
import { AttendanceService } from './attendance.service';
import { Logger } from '@nestjs/common';
import { AttendanceSource } from '../../generated/prisma';

describe('AttendanceScheduler', () => {
  let scheduler: AttendanceScheduler;
  let service: jest.Mocked<AttendanceService>;

  const mockService = {
    autoCloseInactiveRecords: jest.fn(),
    closeAllOpenRecords: jest.fn(),
    cleanOldHeartbeats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceScheduler,
        { provide: AttendanceService, useValue: mockService },
      ],
    }).compile();

    scheduler = module.get<AttendanceScheduler>(AttendanceScheduler);
    service = module.get<AttendanceService>(AttendanceService) as jest.Mocked<AttendanceService>;
    
    // Silence logger for tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  describe('handleInactivityClose', () => {
    it('should call autoCloseInactiveRecords and log if count > 0', async () => {
      mockService.autoCloseInactiveRecords.mockResolvedValue(5);
      await scheduler.handleInactivityClose();
      expect(service.autoCloseInactiveRecords).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Se cerraron 5 registro(s) por inactividad.'));
    });

    it('should not log if count is 0', async () => {
      mockService.autoCloseInactiveRecords.mockResolvedValue(0);
      await scheduler.handleInactivityClose();
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockService.autoCloseInactiveRecords.mockRejectedValue(new Error('test-error'));
      await scheduler.handleInactivityClose();
      expect(Logger.prototype.error).toHaveBeenCalledWith('[Inactividad] Error al cerrar registros inactivos', expect.any(Error));
    });
  });

  describe('handleEndOfDayClose', () => {
    it('should call closeAllOpenRecords and log if count > 0', async () => {
      mockService.closeAllOpenRecords.mockResolvedValue(3);
      await scheduler.handleEndOfDayClose();
      expect(service.closeAllOpenRecords).toHaveBeenCalledWith(AttendanceSource.SYSTEM);
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Se cerraron 3 registro(s) abiertos.'));
    });

    it('should not log if count is 0', async () => {
      mockService.closeAllOpenRecords.mockResolvedValue(0);
      await scheduler.handleEndOfDayClose();
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockService.closeAllOpenRecords.mockRejectedValue(new Error('test-error'));
      await scheduler.handleEndOfDayClose();
      expect(Logger.prototype.error).toHaveBeenCalledWith('[Fin de día] Error al cerrar registros abiertos', expect.any(Error));
    });
  });

  describe('cleanOldHeartbeats', () => {
    it('should call cleanOldHeartbeats and log if count > 0', async () => {
      mockService.cleanOldHeartbeats.mockResolvedValue(10);
      await scheduler.cleanOldHeartbeats();
      expect(service.cleanOldHeartbeats).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Se eliminaron 10 heartbeat(s) antiguos.'));
    });

    it('should not log if count is 0', async () => {
      mockService.cleanOldHeartbeats.mockResolvedValue(0);
      await scheduler.cleanOldHeartbeats();
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockService.cleanOldHeartbeats.mockRejectedValue(new Error('test-error'));
      await scheduler.cleanOldHeartbeats();
      expect(Logger.prototype.error).toHaveBeenCalledWith('[Limpieza] Error al limpiar heartbeats antiguos', expect.any(Error));
    });
  });
});
