import { Test, TestingModule } from '@nestjs/testing';
import { SupplyCategoriesRepository } from './supply-categories.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockCategory = {
  id: 'cat-1',
  name: 'Tintas',
  slug: 'tintas',
  description: 'Tintas y pigmentos',
  icon: '🎨',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SupplyCategoriesRepository', () => {
  let repository: SupplyCategoriesRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyCategoriesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<SupplyCategoriesRepository>(SupplyCategoriesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should filter only active categories by default', async () => {
      prisma.supplyCategory.findMany.mockResolvedValue([mockCategory]);

      await repository.findAll();

      expect(prisma.supplyCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.supplyCategory.findMany.mockResolvedValue([mockCategory]);

      await repository.findAll(true);

      const callArg = prisma.supplyCategory.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order by sortOrder asc then name asc', async () => {
      prisma.supplyCategory.findMany.mockResolvedValue([mockCategory]);

      await repository.findAll();

      expect(prisma.supplyCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should call supplyCategory.findUnique with the given id', async () => {
      prisma.supplyCategory.findUnique.mockResolvedValue(mockCategory);

      const result = await repository.findById('cat-1');

      expect(prisma.supplyCategory.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' } }),
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category does not exist', async () => {
      prisma.supplyCategory.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByName
  // -------------------------------------------------------------------------
  describe('findByName', () => {
    it('should call supplyCategory.findUnique with the given name', async () => {
      prisma.supplyCategory.findUnique.mockResolvedValue(mockCategory);

      await repository.findByName('Tintas');

      expect(prisma.supplyCategory.findUnique).toHaveBeenCalledWith({
        where: { name: 'Tintas' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByNameExcludingId
  // -------------------------------------------------------------------------
  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.supplyCategory.findFirst.mockResolvedValue(null);

      await repository.findByNameExcludingId('Tintas', 'cat-2');

      expect(prisma.supplyCategory.findFirst).toHaveBeenCalledWith({
        where: { name: 'Tintas', NOT: { id: 'cat-2' } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------
  describe('findBySlug', () => {
    it('should call supplyCategory.findUnique with the given slug', async () => {
      prisma.supplyCategory.findUnique.mockResolvedValue(mockCategory);

      await repository.findBySlug('tintas');

      expect(prisma.supplyCategory.findUnique).toHaveBeenCalledWith({
        where: { slug: 'tintas' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findBySlugExcludingId
  // -------------------------------------------------------------------------
  describe('findBySlugExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.supplyCategory.findFirst.mockResolvedValue(null);

      await repository.findBySlugExcludingId('tintas', 'cat-2');

      expect(prisma.supplyCategory.findFirst).toHaveBeenCalledWith({
        where: { slug: 'tintas', NOT: { id: 'cat-2' } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call supplyCategory.create with the provided data', async () => {
      prisma.supplyCategory.create.mockResolvedValue(mockCategory);

      await repository.create({ name: 'Nueva Categoría', slug: 'nueva-categoria' } as any);

      expect(prisma.supplyCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Nueva Categoría', slug: 'nueva-categoria' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should call supplyCategory.update with the given id and data', async () => {
      prisma.supplyCategory.update.mockResolvedValue(mockCategory);

      await repository.update('cat-1', { name: 'Tintas Actualizadas' } as any);

      expect(prisma.supplyCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cat-1' },
          data: { name: 'Tintas Actualizadas' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call supplyCategory.delete with the given id', async () => {
      prisma.supplyCategory.delete.mockResolvedValue(mockCategory);

      await repository.delete('cat-1');

      expect(prisma.supplyCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });
});
