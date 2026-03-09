import { Test, TestingModule } from '@nestjs/testing';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollItemsService } from '../items/payroll-items.service';
import { PrismaService } from '../../../database/prisma.service';

describe('PayrollPeriodsController', () => {
  let controller: PayrollPeriodsController;
  let periodsService: jest.Mocked<PayrollPeriodsService>;
  let itemsService: jest.Mocked<PayrollItemsService>;

  beforeEach(async () => {
    periodsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
      generateItems: jest.fn(),
    } as any;

    itemsService = {
      findByPeriod: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollPeriodsController],
      providers: [
        { provide: PayrollPeriodsService, useValue: periodsService },
        { provide: PayrollItemsService, useValue: itemsService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PayrollPeriodsController>(PayrollPeriodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of periods', async () => {
      const result: any = { data: [], meta: { total: 0 } };
      periodsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(periodsService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should return a period by id', async () => {
      const result: any = { id: 'p1' };
      periodsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('p1')).toBe(result);
      expect(periodsService.findOne).toHaveBeenCalledWith('p1');
    });
  });

  describe('create', () => {
    it('should create a period', async () => {
      const dto: any = { status: 'OPEN', year: 2024, month: 1 };
      const expectedResult: any = { id: 'p1', ...dto };
      periodsService.create.mockResolvedValue(expectedResult);

      expect(await controller.create(dto)).toBe(expectedResult);
      expect(periodsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a period', async () => {
      const dto: any = { status: 'CLOSED' };
      const expectedResult: any = { id: 'p1', ...dto };
      periodsService.update.mockResolvedValue(expectedResult);

      expect(await controller.update('p1', dto)).toBe(expectedResult);
      expect(periodsService.update).toHaveBeenCalledWith('p1', dto);
    });
  });

  describe('remove', () => {
    it('should delete a period', async () => {
      periodsService.remove.mockResolvedValue({ message: 'Deleted' } as any);
      const res = await controller.remove('p1');
      expect(periodsService.remove).toHaveBeenCalledWith('p1');
      expect(res).toEqual({ message: 'Deleted' });
    });
  });
});
