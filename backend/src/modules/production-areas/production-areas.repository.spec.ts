import { Test, TestingModule } from '@nestjs/testing';
import { ProductionAreasRepository } from './production-areas.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

const mockProductionArea = {
  id: 'pa-1',
  name: 'Serigrafía',
  description: 'Área de serigrafía',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductionAreasRepository', () => {
  let repository: ProductionAreasRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionAreasRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<ProductionAreasRepository>(ProductionAreasRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should filter only active production areas by default', async () => {
      prisma.productionArea.findMany.mockResolvedValue([mockProductionArea]);
      await repository.findAll();
      expect(prisma.productionArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.productionArea.findMany.mockResolvedValue([mockProductionArea]);
      await repository.findAll(true);
      const callArg = prisma.productionArea.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order by name asc', async () => {
      prisma.productionArea.findMany.mockResolvedValue([mockProductionArea]);
      await repository.findAll();
      expect(prisma.productionArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('findById', () => {
    it('should call productionArea.findUnique with the given id', async () => {
      prisma.productionArea.findUnique.mockResolvedValue(mockProductionArea);
      const result = await repository.findById('pa-1');
      expect(prisma.productionArea.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pa-1' } }),
      );
      expect(result).toEqual(mockProductionArea);
    });

    it('should return null when area does not exist', async () => {
      prisma.productionArea.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should call productionArea.findUnique with the given name', async () => {
      prisma.productionArea.findUnique.mockResolvedValue(mockProductionArea);
      await repository.findByName('Serigrafía');
      expect(prisma.productionArea.findUnique).toHaveBeenCalledWith({
        where: { name: 'Serigrafía' },
      });
    });
  });

  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.productionArea.findFirst.mockResolvedValue(null);
      await repository.findByNameExcludingId('Serigrafía', 'pa-2');
      expect(prisma.productionArea.findFirst).toHaveBeenCalledWith({
        where: { name: 'Serigrafía', NOT: { id: 'pa-2' } },
      });
    });
  });

  describe('create', () => {
    it('should call productionArea.create with the provided data', async () => {
      prisma.productionArea.create.mockResolvedValue(mockProductionArea);
      await repository.create({ name: 'Nueva Área' } as any);
      expect(prisma.productionArea.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nueva Área' } }),
      );
    });
  });

  describe('update', () => {
    it('should call productionArea.update with the given id and data', async () => {
      prisma.productionArea.update.mockResolvedValue(mockProductionArea);
      await repository.update('pa-1', { name: 'Actualizada' } as any);
      expect(prisma.productionArea.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pa-1' }, data: { name: 'Actualizada' } }),
      );
    });
  });

  describe('delete', () => {
    it('should call productionArea.delete with the given id', async () => {
      prisma.productionArea.delete.mockResolvedValue(mockProductionArea);
      await repository.delete('pa-1');
      expect(prisma.productionArea.delete).toHaveBeenCalledWith({ where: { id: 'pa-1' } });
    });
  });
});
