import { Test, TestingModule } from '@nestjs/testing';
import { PayrollEmployeesController } from './payroll-employees.controller';
import { PayrollEmployeesService } from './payroll-employees.service';
import { CreatePayrollEmployeeDto, EmployeeType } from './dto/create-payroll-employee.dto';
import { UpdatePayrollEmployeeDto } from './dto/update-payroll-employee.dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { PrismaService } from '../../../database/prisma.service';

describe('PayrollEmployeesController', () => {
  let controller: PayrollEmployeesController;
  let service: PayrollEmployeesService;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getHistory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollEmployeesController],
      providers: [
        { provide: PayrollEmployeesService, useValue: mockService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollEmployeesController>(PayrollEmployeesController);
    service = module.get<PayrollEmployeesService>(PayrollEmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const id = '1';
      mockService.findOne.mockResolvedValue({ id });
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('getHistory', () => {
    it('should call service.getHistory with id', async () => {
      const id = '1';
      mockService.getHistory.mockResolvedValue([]);
      await controller.getHistory(id);
      expect(service.getHistory).toHaveBeenCalledWith(id);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto: CreatePayrollEmployeeDto = {
        userId: 'u1',
        employeeType: EmployeeType.REGULAR,
        startDate: '2026-01-01',
      };
      mockService.create.mockResolvedValue({ id: 'e1', ...dto });
      await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const id = 'e1';
      const dto: UpdatePayrollEmployeeDto = { monthlySalary: 2000 };
      mockService.update.mockResolvedValue({ id, ...dto });
      await controller.update(id, dto);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      const id = 'e1';
      mockService.remove.mockResolvedValue({ message: 'Deleted' });
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
