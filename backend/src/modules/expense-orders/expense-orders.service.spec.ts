import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseOrdersService } from './expense-orders.service';
import { ExpenseOrdersRepository } from './expense-orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { PrismaService } from '../../database/prisma.service';
import { ExpenseOrderAuthRequestsService } from '../expense-order-auth-requests/expense-order-auth-requests.service';
import { ExpenseOrderStatus } from '../../generated/prisma';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateExpenseOrderDto, UpdateExpenseOrderDto } from './dto';

describe('ExpenseOrdersService', () => {
  let service: ExpenseOrdersService;
  let repository: jest.Mocked<ExpenseOrdersRepository>;
  let consecutivesService: jest.Mocked<ConsecutivesService>;
  let prisma: jest.Mocked<PrismaService>;
  let authRequestsService: jest.Mocked<ExpenseOrderAuthRequestsService>;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      replaceItems: jest.fn(),
      addItem: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    } as any;

    consecutivesService = {
      generateNumber: jest.fn().mockResolvedValue('OG-001'),
      syncCounter: jest.fn(),
    } as any;

    prisma = {
      workOrder: {
        findUnique: jest.fn(),
      },
      expenseSubcategory: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
    } as any;

    authRequestsService = {
      hasApprovedRequest: jest.fn(),
      getApprovedRequest: jest.fn(),
      consumeApprovedRequest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseOrdersService,
        { provide: ExpenseOrdersRepository, useValue: repository },
        { provide: ConsecutivesService, useValue: consecutivesService },
        { provide: PrismaService, useValue: prisma },
        { provide: ExpenseOrderAuthRequestsService, useValue: authRequestsService },
      ],
    }).compile();

    service = module.get<ExpenseOrdersService>(ExpenseOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      expenseTypeId: 'type-id',
      expenseSubcategoryId: 'sub-id',
      authorizedToId: 'auth-1',
      observations: 'Test',
      items: [
        {
          quantity: 2,
          unitPrice: 10,
          name: 'Item 1',
          paymentMethod: 'CASH',
        },
      ],
    } as any;
    const createdById = 'user-1';

    it('should create an expense order successfully without work order', async () => {
      (prisma.expenseSubcategory.findFirst as jest.Mock).mockResolvedValue({ id: 'sub-id' } as any);
      (repository.create as jest.Mock).mockResolvedValue({ id: 'order-1', ogNumber: 'OG-001' } as any);

      const result = await service.create(createDto, createdById);

      expect(prisma.expenseSubcategory.findFirst).toHaveBeenCalled();
      expect(consecutivesService.generateNumber).toHaveBeenCalledWith('EXPENSE');
      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'order-1', ogNumber: 'OG-001' });
    });

    it('should throw BadRequestException if subcategory not found', async () => {
      (prisma.expenseSubcategory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, createdById)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if workOrder provided but not found', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, workOrderId: 'missing' }, createdById),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if productionAreaIds used without workOrderId', async () => {
      const dtoWithProductionArea: CreateExpenseOrderDto = {
        ...createDto,
        items: [{ ...createDto.items[0], productionAreaIds: ['prod-1'] }],
      };

      await expect(service.create(dtoWithProductionArea, createdById)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of expense orders', async () => {
      const filters = { page: 1, limit: 10 };
      (repository.findAll as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0 } } as any);

      const result = await service.findAll(filters);

      expect(repository.findAll).toHaveBeenCalledWith(filters);
      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an expense order if found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({ id: 'order-1' } as any);

      const result = await service.findOne('order-1');

      expect(repository.findById).toHaveBeenCalledWith('order-1');
      expect(result.id).toBe('order-1');
    });

    it('should throw NotFoundException if expense order not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateExpenseOrderDto = {
      observations: 'Updated',
    };

    it('should update an expense order if editable', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.DRAFT,
      } as any);
      (repository.update as jest.Mock).mockResolvedValue(true as any);

      await service.update('order-1', updateDto);

      expect(repository.update).toHaveBeenCalledWith('order-1', updateDto);
    });

    it('should throw NotFoundException if expense order not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.update('missing', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if expense order is not editable', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.PAID,
      } as any);

      await expect(service.update('order-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an expense order if DRAFT', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.DRAFT,
      } as any);
      (repository.delete as jest.Mock).mockResolvedValue(true as any);

      await service.remove('order-1');

      expect(repository.delete).toHaveBeenCalledWith('order-1');
    });

    it('should throw BadRequestException if not DRAFT', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.CREATED,
      } as any);

      await expect(service.remove('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('order-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException for invalid transitions', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.DRAFT,
      } as any);

      await expect(
        service.updateStatus('order-1', { status: ExpenseOrderStatus.PAID } as any, { id: 'u1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status if valid transition (DRAFT -> CREATED)', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.DRAFT,
      } as any);
      (repository.updateStatus as jest.Mock).mockResolvedValue({ id: 'order-1', status: ExpenseOrderStatus.CREATED } as any);

      const result = await service.updateStatus(
        'order-1',
        { status: ExpenseOrderStatus.CREATED } as any,
        { id: 'u1' } as any,
      );

      expect(repository.updateStatus).toHaveBeenCalledWith('order-1', 'CREATED');
      expect(result!.status).toBe('CREATED');
    });

    it('should update status to ADMIN_AUTHORIZED directly if admin (first auth)', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.CREATED,
      } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: { name: 'admin' } } as any);
      (repository.updateStatus as jest.Mock).mockResolvedValue({ id: 'order-1', status: ExpenseOrderStatus.ADMIN_AUTHORIZED } as any);
      (repository.findById as jest.Mock).mockResolvedValueOnce({ id: 'order-1', status: ExpenseOrderStatus.CREATED } as any)
        .mockResolvedValueOnce({ id: 'order-1', status: ExpenseOrderStatus.ADMIN_AUTHORIZED } as any);

      await service.updateStatus('order-1', { status: ExpenseOrderStatus.ADMIN_AUTHORIZED } as any, { id: 'admin1', roleId: 'r1' } as any);

      expect(repository.updateStatus).toHaveBeenCalledWith('order-1', 'ADMIN_AUTHORIZED', { authorizedById: 'admin1', authorizedAt: expect.any(Date) });
    });

    it('should throw ForbiddenException if non-admin tries to pre-authorize without approved request', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: ExpenseOrderStatus.CREATED,
      } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: { name: 'user' } } as any);
      (authRequestsService.hasApprovedRequest as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updateStatus('order-1', { status: ExpenseOrderStatus.ADMIN_AUTHORIZED } as any, { id: 'u1', roleId: 'r1' } as any)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
