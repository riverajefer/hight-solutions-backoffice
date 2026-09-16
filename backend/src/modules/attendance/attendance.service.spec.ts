import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceSource } from '../../generated/prisma';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repository: jest.Mocked<AttendanceRepository>;

  const mockRepository = {
    findActiveRecord: jest.fn(),
    findLastClosedRecordSince: jest.fn(),
    createClockIn: jest.fn(),
    updateClockOut: jest.fn(),
    findMyRecords: jest.fn(),
    findAll: jest.fn(),
    adjustRecord: jest.fn(),
    createHeartbeat: jest.fn(),
    findOpenRecordsInactiveFor: jest.fn(),
    findAllOpenRecords: jest.fn(),
    deleteOldHeartbeats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get<AttendanceRepository>(AttendanceRepository) as jest.Mocked<AttendanceRepository>;

    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should throw ConflictException if user already has an active record', async () => {
      repository.findActiveRecord.mockResolvedValue({ id: 'some-id' } as any);
      await expect(service.clockIn('user-1')).rejects.toThrow(ConflictException);
    });

    it('should create a clock in record and return it', async () => {
      repository.findActiveRecord.mockResolvedValue(null);
      repository.createClockIn.mockResolvedValue({ id: 'new-id' } as any);
      const result = await service.clockIn('user-1');
      expect(result).toEqual({ id: 'new-id' });
      expect(repository.createClockIn).toHaveBeenCalledWith('user-1', expect.any(Date), undefined, undefined);
    });
  });

  describe('clockOut', () => {
    it('should throw NotFoundException if user has no active record', async () => {
      repository.findActiveRecord.mockResolvedValue(null);
      await expect(service.clockOut('user-1', { notes: 'done' })).rejects.toThrow(NotFoundException);
    });

    it('should update clock out for active record', async () => {
      repository.findActiveRecord.mockResolvedValue({ id: 'active-id' } as any);
      repository.updateClockOut.mockResolvedValue({ id: 'active-id', clockOut: new Date() } as any);

      const result = await service.clockOut('user-1', { notes: 'done' });
      expect(result.id).toEqual('active-id');
      expect(repository.updateClockOut).toHaveBeenCalledWith('active-id', expect.any(Date), AttendanceSource.BUTTON, 'done');
    });
  });

  describe('getMyStatus', () => {
    afterEach(() => jest.useRealTimers());

    it('should return { active: true, record } if active', async () => {
      const record = { id: 'uuid' };
      repository.findActiveRecord.mockResolvedValue(record as any);
      const result = await service.getMyStatus('u-1');
      expect(result).toEqual({ active: true, record, autoClosedAt: null });
      expect(repository.findLastClosedRecordSince).not.toHaveBeenCalled();
    });

    it('should return { active: false, record: null } if inactive', async () => {
      repository.findActiveRecord.mockResolvedValue(null);
      repository.findLastClosedRecordSince.mockResolvedValue(null);
      const result = await service.getMyStatus('u-1');
      expect(result).toEqual({ active: false, record: null, autoClosedAt: null });
    });

    // Es lo que hace aparecer el aviso de horas extra en el frontend.
    it('informa la hora del cierre automático de hoy', async () => {
      const closedAt = new Date('2026-09-15T19:00:00-05:00');
      repository.findActiveRecord.mockResolvedValue(null);
      repository.findLastClosedRecordSince.mockResolvedValue({
        clockOut: closedAt,
        source: AttendanceSource.SYSTEM,
      } as any);

      const result = await service.getMyStatus('u-1');

      expect(result).toEqual({ active: false, record: null, autoClosedAt: closedAt });
    });

    // Si marcó salida él mismo después del cierre (p. ej. terminó sus horas
    // extra), no hay nada que avisarle.
    it.each([AttendanceSource.BUTTON, AttendanceSource.LOGOUT, AttendanceSource.INACTIVITY])(
      'no avisa si el último cierre de hoy fue %s',
      async (source) => {
        repository.findActiveRecord.mockResolvedValue(null);
        repository.findLastClosedRecordSince.mockResolvedValue({
          clockOut: new Date(),
          source,
        } as any);

        const result = await service.getMyStatus('u-1');

        expect(result.autoClosedAt).toBeNull();
      },
    );

    // A las 11:30 p. m. de Colombia en UTC ya es el día siguiente: "hoy" tiene
    // que ser el día de Colombia.
    it('busca los cierres desde el inicio del día en hora Colombia', async () => {
      jest.useFakeTimers({ now: new Date('2026-09-15T23:30:00-05:00') });
      repository.findActiveRecord.mockResolvedValue(null);
      repository.findLastClosedRecordSince.mockResolvedValue(null);

      await service.getMyStatus('u-1');

      expect(repository.findLastClosedRecordSince).toHaveBeenCalledWith(
        'u-1',
        new Date('2026-09-15T05:00:00.000Z'),
      );
    });
  });

  describe('getMyRecords', () => {
    it('should call repository.findMyRecords', async () => {
      repository.findMyRecords.mockResolvedValue({ data: [], meta: {} } as any);
      await service.getMyRecords('userId', { page: 1 });
      expect(repository.findMyRecords).toHaveBeenCalledWith('userId', { page: 1 });
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      repository.findAll.mockResolvedValue({ data: [], meta: {} } as any);
      await service.findAll({ page: 1 });
      expect(repository.findAll).toHaveBeenCalledWith({ page: 1 });
    });
  });

  describe('adjustRecord', () => {
    it('should throw NotFoundException if not found', async () => {
      repository.adjustRecord.mockResolvedValue(null);
      await expect(service.adjustRecord('id', { reason: 'test' })).rejects.toThrow(NotFoundException);
    });

    it('should return adjusted record', async () => {
      repository.adjustRecord.mockResolvedValue({ id: 'id' } as any);
      const result = await service.adjustRecord('id', { reason: 'test' });
      expect(result).toEqual({ id: 'id' });
    });
  });

  describe('recordHeartbeat', () => {
    it('should create heartbeat', async () => {
      repository.createHeartbeat.mockResolvedValue({} as any);
      await service.recordHeartbeat('u1', 'end');
      expect(repository.createHeartbeat).toHaveBeenCalledWith('u1', 'end');
    });
  });

  describe('autoCloseInactiveRecords', () => {
    it('should update and return count', async () => {
      repository.findOpenRecordsInactiveFor.mockResolvedValue([{ id: 'id1' }, { id: 'id2' }] as any[]);
      repository.updateClockOut.mockResolvedValue({} as any);
      
      const count = await service.autoCloseInactiveRecords();
      expect(count).toBe(2);
      expect(repository.updateClockOut).toHaveBeenCalledTimes(2);
      expect(repository.updateClockOut).toHaveBeenCalledWith('id1', expect.any(Date), AttendanceSource.INACTIVITY);
    });
  });

  describe('closeAllOpenRecords', () => {
    it('should close all open records', async () => {
      repository.findAllOpenRecords.mockResolvedValue([{ id: 'r1' }] as any[]);
      repository.updateClockOut.mockResolvedValue({} as any);
      
      const count = await service.closeAllOpenRecords(AttendanceSource.SYSTEM);
      expect(count).toBe(1);
      expect(repository.updateClockOut).toHaveBeenCalledWith('r1', expect.any(Date), AttendanceSource.SYSTEM);
    });
  });

  describe('closeOpenRecordOnLogout', () => {
    it('should do nothing if no active record', async () => {
      repository.findActiveRecord.mockResolvedValue(null);
      await service.closeOpenRecordOnLogout('user1');
      expect(repository.updateClockOut).not.toHaveBeenCalled();
    });

    it('should close record if active', async () => {
      repository.findActiveRecord.mockResolvedValue({ id: 'r1' } as any);
      repository.updateClockOut.mockResolvedValue({} as any);
      await service.closeOpenRecordOnLogout('user1');
      expect(repository.updateClockOut).toHaveBeenCalledWith('r1', expect.any(Date), AttendanceSource.LOGOUT);
    });
  });

  describe('cleanOldHeartbeats', () => {
    it('should delete and return count', async () => {
      repository.deleteOldHeartbeats.mockResolvedValue({ count: 5 });
      const count = await service.cleanOldHeartbeats();
      expect(count).toBe(5);
      expect(repository.deleteOldHeartbeats).toHaveBeenCalledWith(expect.any(Date));
    });
  });

});
