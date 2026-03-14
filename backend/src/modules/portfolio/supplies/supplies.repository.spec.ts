import { Test, TestingModule } from '@nestjs/testing';
import { SuppliesRepository } from './supplies.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';

const mockSupply = {
  id: 'supply-1',
  name: 'Tinta Negra',
  sku: 'TINTA-001',
  isActive: true,
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Tintas', slug: 'tintas', icon: '🎨' },
  purchaseUnit: { id: 'unit-1', name: 'Litro', abbreviation: 'L' },
  consumptionUnit: { id: 'unit-2', name: 'Mililitro', abbreviation: 'mL' },
};

describe('SuppliesRepository', () => {
  let repository: SuppliesRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<SuppliesRepository>(SuppliesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should filter only active supplies by default', async () => {
      prisma.supply.findMany.mockResolvedValue([mockSupply]);
      await repository.findAll();
      const callArg = prisma.supply.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ isActive: true });
    });

    it('should not filter by isActive when includeInactive=true', async () => {
      prisma.supply.findMany.mockResolvedValue([mockSupply]);
      await repository.findAll(true);
      const callArg = prisma.supply.findMany.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty('isActive');
    });

    it('should filter by categoryId when provided', async () => {
      prisma.supply.findMany.mockResolvedValue([mockSupply]);
      await repository.findAll(false, 'cat-1');
      const callArg = prisma.supply.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ categoryId: 'cat-1' });
    });

    it('should include category, purchaseUnit and consumptionUnit', async () => {
      prisma.supply.findMany.mockResolvedValue([mockSupply]);
      await repository.findAll();
      const callArg = prisma.supply.findMany.mock.calls[0][0];
      expect(callArg.include.category).toBeDefined();
      expect(callArg.include.purchaseUnit).toBeDefined();
      expect(callArg.include.consumptionUnit).toBeDefined();
    });

    it('should order by name asc', async () => {
      prisma.supply.findMany.mockResolvedValue([mockSupply]);
      await repository.findAll();
      const callArg = prisma.supply.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toEqual([{ name: 'asc' }]);
    });
  });

  describe('findById', () => {
    it('should call supply.findUnique with the given id', async () => {
      prisma.supply.findUnique.mockResolvedValue(mockSupply);
      const result = await repository.findById('supply-1');
      expect(prisma.supply.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'supply-1' } }),
      );
      expect(result).toEqual(mockSupply);
    });

    it('should return null when supply does not exist', async () => {
      prisma.supply.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findBySku', () => {
    it('should call supply.findUnique with the given sku', async () => {
      prisma.supply.findUnique.mockResolvedValue(mockSupply);
      await repository.findBySku('TINTA-001');
      expect(prisma.supply.findUnique).toHaveBeenCalledWith({ where: { sku: 'TINTA-001' } });
    });
  });

  describe('findBySkuExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.supply.findFirst.mockResolvedValue(null);
      await repository.findBySkuExcludingId('TINTA-001', 'supply-2');
      expect(prisma.supply.findFirst).toHaveBeenCalledWith({
        where: { sku: 'TINTA-001', NOT: { id: 'supply-2' } },
      });
    });
  });

  describe('findByNameAndCategory', () => {
    it('should call findFirst with name and categoryId', async () => {
      prisma.supply.findFirst.mockResolvedValue(mockSupply);
      await repository.findByNameAndCategory('Tinta Negra', 'cat-1');
      expect(prisma.supply.findFirst).toHaveBeenCalledWith({
        where: { name: 'Tinta Negra', categoryId: 'cat-1' },
      });
    });
  });

  describe('findByNameAndCategoryExcludingId', () => {
    it('should use findFirst with name, categoryId and NOT id clause', async () => {
      prisma.supply.findFirst.mockResolvedValue(null);
      await repository.findByNameAndCategoryExcludingId('Tinta Negra', 'cat-1', 'supply-2');
      expect(prisma.supply.findFirst).toHaveBeenCalledWith({
        where: { name: 'Tinta Negra', categoryId: 'cat-1', NOT: { id: 'supply-2' } },
      });
    });
  });

  describe('create', () => {
    it('should call supply.create with the provided data', async () => {
      prisma.supply.create.mockResolvedValue(mockSupply);
      await repository.create({ name: 'Nuevo Insumo', sku: 'NEW-001' } as any);
      expect(prisma.supply.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nuevo Insumo', sku: 'NEW-001' } }),
      );
    });
  });

  describe('update', () => {
    it('should call supply.update with the given id and data', async () => {
      prisma.supply.update.mockResolvedValue(mockSupply);
      await repository.update('supply-1', { name: 'Actualizado' } as any);
      expect(prisma.supply.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'supply-1' }, data: { name: 'Actualizado' } }),
      );
    });
  });

  describe('delete', () => {
    it('should call supply.delete with the given id', async () => {
      prisma.supply.delete.mockResolvedValue(mockSupply);
      await repository.delete('supply-1');
      expect(prisma.supply.delete).toHaveBeenCalledWith({ where: { id: 'supply-1' } });
    });
  });

  describe('findLowStock', () => {
    it('should call $queryRaw and return low stock supplies', async () => {
      prisma.$queryRaw.mockResolvedValue([mockSupply]);
      const result = await repository.findLowStock();
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual([mockSupply]);
    });
  });
});
