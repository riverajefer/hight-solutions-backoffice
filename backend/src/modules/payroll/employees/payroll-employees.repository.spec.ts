import { Test, TestingModule } from '@nestjs/testing';
import { PayrollEmployeesRepository } from './payroll-employees.repository';
import { PrismaService } from '../../../database/prisma.service';
import { EmployeeType } from '../../../generated/prisma';

describe('PayrollEmployeesRepository', () => {
  let repository: PayrollEmployeesRepository;
  let prisma: PrismaService;

  const mockPrisma = {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    payrollItem: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEmployeesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PayrollEmployeesRepository>(PayrollEmployeesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call prisma.employee.findMany', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([]);
      await repository.findAll();
      expect(prisma.employee.findMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should call prisma.employee.findUnique', async () => {
      const id = '1';
      mockPrisma.employee.findUnique.mockResolvedValue(null);
      await repository.findById(id);
      expect(prisma.employee.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id } })
      );
    });
  });

  describe('findByUserId', () => {
    it('should call prisma.employee.findUnique with userId', async () => {
      const userId = 'u1';
      mockPrisma.employee.findUnique.mockResolvedValue(null);
      await repository.findByUserId(userId);
      expect(prisma.employee.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      );
    });
  });

  describe('create', () => {
    it('should call prisma.employee.create', async () => {
      const data: any = { userId: 'u1', employeeType: EmployeeType.REGULAR };
      mockPrisma.employee.create.mockResolvedValue({ id: 'e1', ...data });
      await repository.create(data);
      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({ data })
      );
    });
  });

  describe('update', () => {
    it('should call prisma.employee.update', async () => {
      const id = 'e1';
      const data: any = { monthlySalary: 1000 };
      mockPrisma.employee.update.mockResolvedValue({ id, ...data });
      await repository.update(id, data);
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id }, data })
      );
    });
  });

  describe('delete', () => {
    it('should call prisma.employee.delete', async () => {
      const id = 'e1';
      mockPrisma.employee.delete.mockResolvedValue({ id });
      await repository.delete(id);
      expect(prisma.employee.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id } })
      );
    });
  });

  describe('findHistory', () => {
    it('should call prisma.payrollItem.findMany with employeeId', async () => {
      const employeeId = 'e1';
      mockPrisma.payrollItem.findMany.mockResolvedValue([]);
      await repository.findHistory(employeeId);
      expect(prisma.payrollItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId } })
      );
    });
  });
});
