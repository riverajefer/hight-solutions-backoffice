import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionRepository } from './production.repository';
import { PrismaService } from '../../database/prisma.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';

describe('ProductionOrdersService', () => {
  let service: ProductionOrdersService;
  let repo: jest.Mocked<ProductionRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let consecutives: jest.Mocked<ConsecutivesService>;

  const mockRepo = {
    findAllOrders: jest.fn(),
    findOrderById: jest.fn(),
    findTemplateById: jest.fn(),
  };

  const mockPrisma: any = {
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    productionOrder: { create: jest.fn(), update: jest.fn() },
    productionOrderComponent: { create: jest.fn() },
    productionOrderStep: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    productTemplateComponent: { findMany: jest.fn() },
  };

  const mockConsecutives = {
    generateConsecutive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        { provide: ProductionRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConsecutivesService, useValue: mockConsecutives },
      ],
    }).compile();

    service = module.get<ProductionOrdersService>(ProductionOrdersService);
    repo = module.get(ProductionRepository) as any;
    prisma = module.get(PrismaService) as any;
    consecutives = module.get(ConsecutivesService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call repo.findAllOrders', async () => {
      repo.findAllOrders.mockResolvedValue([[], 0] as any);
      await service.findAll({});
      expect(repo.findAllOrders).toHaveBeenCalledWith({ search: undefined, status: undefined, workOrderId: undefined, page: 1, limit: 20 });
    });
  });

  describe('findOne', () => {
    it('should call repo.findOrderById', async () => {
      repo.findOrderById.mockResolvedValue({ id: '1', components: [] } as any);
      await service.findOne('1');
      expect(repo.findOrderById).toHaveBeenCalledWith('1');
    });

    it('should throw if order not found', async () => {
      repo.findOrderById.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow();
    });
  });
});
