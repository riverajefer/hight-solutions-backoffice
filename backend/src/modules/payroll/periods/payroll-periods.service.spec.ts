import { Test, TestingModule } from '@nestjs/testing';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollPeriodsRepository } from './payroll-periods.repository';
import { PayrollItemsRepository } from '../items/payroll-items.repository';
import { PayrollEmployeesRepository } from '../employees/payroll-employees.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollPeriodType } from './dto/create-payroll-period.dto';

describe('PayrollPeriodsService', () => {
  let service: PayrollPeriodsService;
  let periodsRepository: jest.Mocked<PayrollPeriodsRepository>;
  let itemsRepository: jest.Mocked<PayrollItemsRepository>;
  let employeesRepository: jest.Mocked<PayrollEmployeesRepository>;

  beforeEach(async () => {
    periodsRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getSummary: jest.fn(),
    } as any;

    itemsRepository = {
      createMany: jest.fn(),
    } as any;

    employeesRepository = {
      findAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollPeriodsService,
        { provide: PayrollPeriodsRepository, useValue: periodsRepository },
        { provide: PayrollItemsRepository, useValue: itemsRepository },
        { provide: PayrollEmployeesRepository, useValue: employeesRepository },
      ],
    }).compile();

    service = module.get<PayrollPeriodsService>(PayrollPeriodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all periods', async () => {
      periodsRepository.findAll.mockResolvedValue([{ id: 'p1' }] as any);
      const result = await service.findAll();
      expect(result).toEqual([{ id: 'p1' }]);
    });
  });

  describe('findOne', () => {
    it('should return a period', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      expect(await service.findOne('p1')).toEqual({ id: 'p1' });
    });

    it('should throw NotFoundException if not found', async () => {
      periodsRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Enero 2024',
      startDate: new Date('2024-01-01').toISOString(),
      endDate: new Date('2024-01-31').toISOString(),
      periodType: PayrollPeriodType.MONTHLY,
      overtimeDaytimeRate: 1.5,
      overtimeNighttimeRate: 2.0,
    };

    it('should create a period', async () => {
      periodsRepository.create.mockResolvedValue({ id: 'p1', ...createDto } as any);
      const result = await service.create(createDto);
      expect(periodsRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('p1');
    });

    it('should throw BadRequestException if startDate >= endDate', async () => {
      await expect(service.create({ ...createDto, startDate: '2024-02-01' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a period', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      periodsRepository.update.mockResolvedValue({ id: 'p1', name: 'Updated' } as any);

      const result = await service.update('p1', { name: 'Updated' });
      expect(periodsRepository.update).toHaveBeenCalledWith('p1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw BadRequestException if startDate >= endDate', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      await expect(service.update('p1', { startDate: '2024-02-01', endDate: '2024-01-01' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a period', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      periodsRepository.delete.mockResolvedValue(true as any);
      
      const result = await service.remove('p1');
      expect(periodsRepository.delete).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ message: 'Periodo de nómina con ID p1 eliminado' });
    });
  });

  describe('generateItems', () => {
    it('should generate items for active employees', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      employeesRepository.findAll.mockResolvedValue([
        { id: 'e1', status: 'ACTIVE' },
        { id: 'e2', status: 'INACTIVE' },
      ] as any);
      itemsRepository.createMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.generateItems('p1');
      
      expect(itemsRepository.createMany).toHaveBeenCalledWith([
        { periodId: 'p1', employeeId: 'e1', baseSalary: 0, totalPayment: 0 }
      ]);
      expect(result).toEqual({ message: 'Se generaron registros para 1 empleado(s) activo(s)', count: 1 });
    });
  });
});
