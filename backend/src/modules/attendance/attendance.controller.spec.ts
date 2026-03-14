import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AuthenticatedUser } from '../../common/interfaces';

import { PermissionsGuard } from '../../common/guards';
import { JwtAuthGuard } from '../auth/guards';

import { PrismaService } from '../../database/prisma.service';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let service: jest.Mocked<AttendanceService>;

  const mockService = {
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    getMyStatus: jest.fn(),
    getMyRecords: jest.fn(),
    findAll: jest.fn(),
    recordHeartbeat: jest.fn(),
    adjustRecord: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
    roleId: 'r1',
    role: { id: 'r1', name: 'USER' } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        { provide: AttendanceService, useValue: mockService },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AttendanceController>(AttendanceController);
    service = module.get<AttendanceService>(AttendanceService) as jest.Mocked<AttendanceService>;
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('clockIn', () => {
    it('should call clockIn on service', async () => {
      mockService.clockIn.mockResolvedValue({ id: 'record-id' } as any);
      const result = await controller.clockIn(mockUser);
      expect(result).toEqual({ id: 'record-id' });
      expect(service.clockIn).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('clockOut', () => {
    it('should call clockOut on service', async () => {
      mockService.clockOut.mockResolvedValue({ id: 'record-id' } as any);
      const dto = { notes: 'done' };
      const result = await controller.clockOut(mockUser, dto);
      expect(result).toEqual({ id: 'record-id' });
      expect(service.clockOut).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('getMyStatus', () => {
    it('should call getMyStatus on service', async () => {
      mockService.getMyStatus.mockResolvedValue({ active: true, record: {} } as any);
      const result = await controller.getMyStatus(mockUser);
      expect(result).toEqual({ active: true, record: {} });
      expect(service.getMyStatus).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getMyRecords', () => {
    it('should call getMyRecords on service', async () => {
      const filters = { page: 1 };
      mockService.getMyRecords.mockResolvedValue({ data: [], meta: {} } as any);
      const result = await controller.getMyRecords(mockUser, filters);
      expect(result).toEqual({ data: [], meta: {} });
      expect(service.getMyRecords).toHaveBeenCalledWith(mockUser.id, filters);
    });
  });

  describe('findAll', () => {
    it('should call findAll on service', async () => {
      const filters = { page: 1 };
      mockService.findAll.mockResolvedValue({ data: [], meta: {} } as any);
      const result = await controller.findAll(filters);
      expect(result).toEqual({ data: [], meta: {} });
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('heartbeat', () => {
    it('should call recordHeartbeat on service', async () => {
      mockService.recordHeartbeat.mockResolvedValue(undefined as any);
      await controller.heartbeat(mockUser);
      expect(service.recordHeartbeat).toHaveBeenCalledWith(mockUser.id, '/attendance/heartbeat');
    });
  });

  describe('adjustRecord', () => {
    it('should call adjustRecord on service', async () => {
      const dto = { reason: 'test' };
      mockService.adjustRecord.mockResolvedValue({ id: 'rec-1' } as any);
      const result = await controller.adjustRecord('rec-1', dto as any);
      expect(result).toEqual({ id: 'rec-1' });
      expect(service.adjustRecord).toHaveBeenCalledWith('rec-1', dto);
    });
  });
});
