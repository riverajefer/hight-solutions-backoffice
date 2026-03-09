import { Test, TestingModule } from '@nestjs/testing';
import { PayrollItemsService } from './payroll-items.service';
import { PayrollItemsRepository } from './payroll-items.repository';
import { PayrollPeriodsRepository } from '../periods/payroll-periods.repository';
import { PayrollEmployeesRepository } from '../employees/payroll-employees.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayrollItemsService', () => {
  let service: PayrollItemsService;
  let itemsRepository: jest.Mocked<PayrollItemsRepository>;
  let periodsRepository: jest.Mocked<PayrollPeriodsRepository>;
  let employeesRepository: jest.Mocked<PayrollEmployeesRepository>;

  beforeEach(async () => {
    itemsRepository = {
      findByPeriod: jest.fn(),
      findById: jest.fn(),
      findByPeriodAndEmployee: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    periodsRepository = {
      findById: jest.fn(),
    } as any;

    employeesRepository = {
      findById: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollItemsService,
        { provide: PayrollItemsRepository, useValue: itemsRepository },
        { provide: PayrollPeriodsRepository, useValue: periodsRepository },
        { provide: PayrollEmployeesRepository, useValue: employeesRepository },
      ],
    }).compile();

    service = module.get<PayrollItemsService>(PayrollItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByPeriod', () => {
    it('should return items for a period', async () => {
      itemsRepository.findByPeriod.mockResolvedValue([{ id: 'i1' }] as any);
      const result = await service.findByPeriod('p1');
      expect(result).toEqual([{ id: 'i1' }]);
      expect(itemsRepository.findByPeriod).toHaveBeenCalledWith('p1');
    });
  });

  describe('findOne', () => {
    it('should return an item', async () => {
      itemsRepository.findById.mockResolvedValue({ id: 'i1' } as any);
      expect(await service.findOne('i1')).toEqual({ id: 'i1' });
    });

    it('should throw NotFoundException if not found', async () => {
      itemsRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('i1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: any = {
      employeeId: 'e1',
      baseSalary: 1000,
      totalPayment: 1000,
    };

    it('should create an item', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      employeesRepository.findById.mockResolvedValue({ id: 'e1' } as any);
      itemsRepository.findByPeriodAndEmployee.mockResolvedValue(null);
      itemsRepository.create.mockResolvedValue({ id: 'i1', ...createDto } as any);

      const result = await service.create('p1', createDto);
      expect(itemsRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('i1');
    });

    it('should throw NotFoundException if period not found', async () => {
      periodsRepository.findById.mockResolvedValue(null);
      await expect(service.create('p1', createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      employeesRepository.findById.mockResolvedValue(null);
      await expect(service.create('p1', createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if item already exists', async () => {
      periodsRepository.findById.mockResolvedValue({ id: 'p1' } as any);
      employeesRepository.findById.mockResolvedValue({ id: 'e1' } as any);
      itemsRepository.findByPeriodAndEmployee.mockResolvedValue({ id: 'i1' } as any);
      await expect(service.create('p1', createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an item', async () => {
      itemsRepository.findById.mockResolvedValue({ id: 'i1', periodId: 'p1' } as any);
      itemsRepository.update.mockResolvedValue({ id: 'i1', baseSalary: 2000 } as any);

      const result = await service.update('p1', 'i1', { baseSalary: 2000 });
      expect(itemsRepository.update).toHaveBeenCalledWith('i1', { baseSalary: 2000 });
      expect(result.baseSalary).toBe(2000);
    });

    it('should throw BadRequestException if item does not belong to period', async () => {
      itemsRepository.findById.mockResolvedValue({ id: 'i1', periodId: 'p2' } as any);
      await expect(service.update('p1', 'i1', { baseSalary: 2000 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an item', async () => {
      itemsRepository.findById.mockResolvedValue({ id: 'i1', periodId: 'p1' } as any);
      itemsRepository.delete.mockResolvedValue(true as any);
      
      const result = await service.remove('p1', 'i1');
      expect(itemsRepository.delete).toHaveBeenCalledWith('i1');
      expect(result).toEqual({ message: 'Registro de nómina con ID i1 eliminado' });
    });

    it('should throw BadRequestException if item does not belong to period', async () => {
      itemsRepository.findById.mockResolvedValue({ id: 'i1', periodId: 'p2' } as any);
      await expect(service.remove('p1', 'i1')).rejects.toThrow(BadRequestException);
    });
  });
});
