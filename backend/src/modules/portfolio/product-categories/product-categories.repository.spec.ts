import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesRepository } from './product-categories.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';

const mockCategory = {
  id: 'cat-1',
  name: 'Ropa',
  slug: 'ropa',
  description: 'Prendas de vestir',
  icon: '👕',
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductCategoriesRepository', () => {
  let repository: ProductCategoriesRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<ProductCategoriesRepository>(ProductCategoriesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should filter only active categories by default', async () => {
      prisma.productCategory.findMany.mockResolvedValue([mockCategory]);
      await repository.findAll();
      expect(prisma.productCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.productCategory.findMany.mockResolvedValue([mockCategory]);
      await repository.findAll(true);
      const callArg = prisma.productCategory.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order by sortOrder asc then name asc', async () => {
      prisma.productCategory.findMany.mockResolvedValue([mockCategory]);
      await repository.findAll();
      expect(prisma.productCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      );
    });
  });

  describe('findById', () => {
    it('should call productCategory.findUnique with the given id', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(mockCategory);
      const result = await repository.findById('cat-1');
      expect(prisma.productCategory.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' } }),
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category does not exist', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should call findUnique with the given name', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(mockCategory);
      await repository.findByName('Ropa');
      expect(prisma.productCategory.findUnique).toHaveBeenCalledWith({ where: { name: 'Ropa' } });
    });
  });

  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.productCategory.findFirst.mockResolvedValue(null);
      await repository.findByNameExcludingId('Ropa', 'cat-2');
      expect(prisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: { name: 'Ropa', NOT: { id: 'cat-2' } },
      });
    });
  });

  describe('findBySlug', () => {
    it('should call findUnique with the given slug', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(mockCategory);
      await repository.findBySlug('ropa');
      expect(prisma.productCategory.findUnique).toHaveBeenCalledWith({ where: { slug: 'ropa' } });
    });
  });

  describe('findBySlugExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.productCategory.findFirst.mockResolvedValue(null);
      await repository.findBySlugExcludingId('ropa', 'cat-2');
      expect(prisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: { slug: 'ropa', NOT: { id: 'cat-2' } },
      });
    });
  });

  describe('create', () => {
    it('should call productCategory.create with the provided data', async () => {
      prisma.productCategory.create.mockResolvedValue(mockCategory);
      await repository.create({ name: 'Nueva Categoría', slug: 'nueva' } as any);
      expect(prisma.productCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nueva Categoría', slug: 'nueva' } }),
      );
    });
  });

  describe('update', () => {
    it('should call productCategory.update with the given id and data', async () => {
      prisma.productCategory.update.mockResolvedValue(mockCategory);
      await repository.update('cat-1', { name: 'Actualizada' } as any);
      expect(prisma.productCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' }, data: { name: 'Actualizada' } }),
      );
    });
  });

  describe('delete', () => {
    it('should call productCategory.delete with the given id', async () => {
      prisma.productCategory.delete.mockResolvedValue(mockCategory);
      await repository.delete('cat-1');
      expect(prisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });
});
