import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  AttendanceScheduler,
  OVERTIME_CAP_JOB,
  WORKDAY_END_JOB,
} from './attendance.scheduler';
import { AttendanceService } from './attendance.service';
import { Logger } from '@nestjs/common';
import { AttendanceSource } from '../../generated/prisma';
import { BUSINESS_TIMEZONE } from '../../common/utils/date-range.util';

describe('AttendanceScheduler', () => {
  let scheduler: AttendanceScheduler;
  let service: jest.Mocked<AttendanceService>;

  const mockService = {
    autoCloseInactiveRecords: jest.fn(),
    closeAllOpenRecords: jest.fn(),
    cleanOldHeartbeats: jest.fn(),
  };
  const mockConfig = { get: jest.fn() };
  const mockRegistry = { addCronJob: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceScheduler,
        { provide: AttendanceService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SchedulerRegistry, useValue: mockRegistry },
      ],
    }).compile();

    scheduler = module.get<AttendanceScheduler>(AttendanceScheduler);
    service = module.get<AttendanceService>(AttendanceService) as jest.Mocked<AttendanceService>;

    // Silence logger for tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  // Antes el cierre era un @Cron sin zona horaria: en Railway (UTC) corría a las
  // 6:59 p. m. de Colombia y las horas extra no tenían tope.
  describe('onModuleInit', () => {
    /** Intercepta los CronJob para no dejar temporizadores reales vivos. */
    const captureJobs = () => {
      const fakeJob = { start: jest.fn(), stop: jest.fn() } as unknown as CronJob;
      return jest.spyOn(CronJob, 'from').mockReturnValue(fakeJob as any);
    };

    it('registra el cierre de jornada a las 19:00 y el tope a las 23:59, en hora Colombia', () => {
      const from = captureJobs();
      mockConfig.get.mockReturnValue(undefined);

      scheduler.onModuleInit();

      expect(from).toHaveBeenCalledWith(
        expect.objectContaining({ cronTime: '0 0 19 * * *', timeZone: BUSINESS_TIMEZONE }),
      );
      expect(from).toHaveBeenCalledWith(
        expect.objectContaining({ cronTime: '0 59 23 * * *', timeZone: BUSINESS_TIMEZONE }),
      );
      expect(mockRegistry.addCronJob).toHaveBeenCalledWith(WORKDAY_END_JOB, expect.anything());
      expect(mockRegistry.addCronJob).toHaveBeenCalledWith(OVERTIME_CAP_JOB, expect.anything());
    });

    it('usa la hora de ATTENDANCE_WORKDAY_END', () => {
      const from = captureJobs();
      mockConfig.get.mockReturnValue('18:30');

      scheduler.onModuleInit();

      expect(mockConfig.get).toHaveBeenCalledWith('ATTENDANCE_WORKDAY_END');
      expect(from).toHaveBeenCalledWith(
        expect.objectContaining({ cronTime: '0 30 18 * * *', timeZone: BUSINESS_TIMEZONE }),
      );
    });

    it('con un valor mal escrito cae a las 19:00 y lo avisa', () => {
      const from = captureJobs();
      mockConfig.get.mockReturnValue('7pm');

      scheduler.onModuleInit();

      expect(from).toHaveBeenCalledWith(expect.objectContaining({ cronTime: '0 0 19 * * *' }));
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('ATTENDANCE_WORKDAY_END'),
      );
    });

    it('arranca los dos trabajos registrados', () => {
      const start = jest.fn();
      jest.spyOn(CronJob, 'from').mockReturnValue({ start, stop: jest.fn() } as any);
      mockConfig.get.mockReturnValue(undefined);

      scheduler.onModuleInit();

      expect(start).toHaveBeenCalledTimes(2);
    });
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

  describe('handleOvertimeCap', () => {
    it('cierra los registros de horas extra que siguen abiertos', async () => {
      mockService.closeAllOpenRecords.mockResolvedValue(2);
      await scheduler.handleOvertimeCap();
      expect(service.closeAllOpenRecords).toHaveBeenCalledWith(AttendanceSource.SYSTEM);
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Se cerraron 2 registro(s) de horas extra abiertos.'));
    });

    it('no falla si el cierre da error', async () => {
      mockService.closeAllOpenRecords.mockRejectedValue(new Error('test-error'));
      await scheduler.handleOvertimeCap();
      expect(Logger.prototype.error).toHaveBeenCalledWith('[Tope horas extra] Error al cerrar registros abiertos', expect.any(Error));
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
