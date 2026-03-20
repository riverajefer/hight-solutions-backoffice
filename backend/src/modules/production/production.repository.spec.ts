import { Test, TestingModule } from '@nestjs/testing';
import { ProductionRepository } from './production.repository';
import { PrismaService } from '../../database/prisma.service';

describe('ProductionRepository', () => {
  let repository: ProductionRepository;
  let prisma: any;

  const mockPrisma = {
    productTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productTemplateComponent: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    productTemplateComponentStep: {
      create: jest.fn(),
    },
    stepDefinition: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productionOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProductionRepository>(ProductionRepository);
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllTemplates', () => {
    it('should call prisma.productTemplate.findMany', async () => {
      prisma.productTemplate.findMany.mockResolvedValue([]);
      const result = await repository.findAllTemplates({});
      expect(result).toEqual([]);
      expect(prisma.productTemplate.findMany).toHaveBeenCalled();
    });
  });

  describe('findTemplateById', () => {
    it('should call prisma.productTemplate.findUnique', async () => {
      prisma.productTemplate.findUnique.mockResolvedValue({ id: '1' } as any);
      const result = await repository.findTemplateById('1');
      expect(result).toEqual({ id: '1' });
      expect(prisma.productTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: expect.any(Object),
      });
    });
  });

  // Basic step definitions
  describe('findAllStepDefinitions', () => {
    it('should call prisma.stepDefinition.findMany', async () => {
      prisma.stepDefinition.findMany.mockResolvedValue([]);
      const result = await repository.findAllStepDefinitions();
      expect(result).toEqual([]);
      expect(prisma.stepDefinition.findMany).toHaveBeenCalled();
    });
  });
  
  describe('findOrderById', () => {
    it('should call prisma.productionOrder.findUnique', async () => {
      prisma.productionOrder.findUnique.mockResolvedValue({ id: '1' } as any);
      const result = await repository.findOrderById('1');
      expect(result).toEqual({ id: '1' });
      expect(prisma.productionOrder.findUnique).toHaveBeenCalled();
    });
  });
});
