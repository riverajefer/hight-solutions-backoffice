import { Test, TestingModule } from '@nestjs/testing';
import { ProductsRepository } from './products.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockProduct = {
  id: 'product-1',
  name: 'Camiseta Personalizada',
  slug: 'camiseta-personalizada',
  isActive: true,
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Ropa', slug: 'ropa', icon: '👕' },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should filter only active products by default', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll();

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ isActive: true });
    });

    it('should not filter by isActive when includeInactive=true', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll(true);

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty('isActive');
    });

    it('should filter by categoryId when provided', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll(false, 'cat-1');

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ categoryId: 'cat-1' });
    });

    it('should not filter by categoryId when not provided', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll();

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty('categoryId');
    });

    it('should order results by name asc', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll();

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toEqual([{ name: 'asc' }]);
    });

    it('should include category in the response', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      await repository.findAll();

      const callArg = prisma.product.findMany.mock.calls[0][0];
      expect(callArg.include).toBeDefined();
      expect(callArg.include.category).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should call product.findUnique with the given id', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await repository.findById('product-1');

      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'product-1' } }),
      );
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------
  describe('findBySlug', () => {
    it('should call product.findUnique with the given slug', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      await repository.findBySlug('camiseta-personalizada');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { slug: 'camiseta-personalizada' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findBySlugExcludingId
  // -------------------------------------------------------------------------
  describe('findBySlugExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await repository.findBySlugExcludingId('camiseta-personalizada', 'product-2');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'camiseta-personalizada',
          NOT: { id: 'product-2' },
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByNameAndCategory
  // -------------------------------------------------------------------------
  describe('findByNameAndCategory', () => {
    it('should call findFirst with name and categoryId', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await repository.findByNameAndCategory('Camiseta Personalizada', 'cat-1');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { name: 'Camiseta Personalizada', categoryId: 'cat-1' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByNameAndCategoryExcludingId
  // -------------------------------------------------------------------------
  describe('findByNameAndCategoryExcludingId', () => {
    it('should call findFirst with name, categoryId, and NOT id clause', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await repository.findByNameAndCategoryExcludingId(
        'Camiseta Personalizada',
        'cat-1',
        'product-2',
      );

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Camiseta Personalizada',
          categoryId: 'cat-1',
          NOT: { id: 'product-2' },
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call product.create with the provided data and include category', async () => {
      prisma.product.create.mockResolvedValue(mockProduct);

      await repository.create({ name: 'Nuevo Producto' } as any);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Nuevo Producto' },
          include: expect.objectContaining({ category: expect.anything() }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should call product.update with the given id and data', async () => {
      prisma.product.update.mockResolvedValue(mockProduct);

      await repository.update('product-1', { name: 'Nombre Actualizado' } as any);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          data: { name: 'Nombre Actualizado' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call product.delete with the given id', async () => {
      prisma.product.delete.mockResolvedValue(mockProduct);

      await repository.delete('product-1');

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'product-1' } });
    });
  });
});
