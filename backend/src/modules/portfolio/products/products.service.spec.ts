import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { Prisma } from '../../../generated/prisma';

const mockProductsRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findBySlugExcludingId: jest.fn(),
  findByNameAndCategory: jest.fn(),
  findByNameAndCategoryExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  const mockCategory = { id: 'cat-1', name: 'Servicios de Diseño' };

  const mockProduct = {
    id: 'prod-1',
    name: 'Logo Corporativo',
    slug: 'logo-corporativo',
    description: 'Diseño de logo',
    basePrice: new Prisma.Decimal('250.00'),
    priceUnit: 'por proyecto',
    categoryId: 'cat-1',
    isActive: true,
    category: mockCategory,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockProductsRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockProductsRepository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(mockProductsRepository.findAll).toHaveBeenCalledWith(false, undefined);
      expect(result).toEqual([mockProduct]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockProductsRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockProductsRepository.findAll).toHaveBeenCalledWith(true, undefined);
    });

    it('should pass categoryId filter to repository when provided', async () => {
      mockProductsRepository.findAll.mockResolvedValue([mockProduct]);

      await service.findAll(false, 'cat-1');

      expect(mockProductsRepository.findAll).toHaveBeenCalledWith(false, 'cat-1');
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return product when found', async () => {
      mockProductsRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductsRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Producto con ID bad-id no encontrado',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Logo Corporativo',
      categoryId: 'cat-1',
      description: 'Diseño de logo',
      basePrice: 250,
      priceUnit: 'por proyecto',
    };

    beforeEach(() => {
      mockProductsRepository.findBySlug.mockResolvedValue(null);
      mockProductsRepository.findByNameAndCategory.mockResolvedValue(null);
      mockProductsRepository.create.mockResolvedValue(mockProduct);
    });

    it('should create product with auto-generated slug from name', async () => {
      await service.create(createDto);

      expect(mockProductsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          slug: 'logo-corporativo',
        }),
      );
    });

    it('should use provided slug when given explicitly', async () => {
      await service.create({ ...createDto, slug: 'mi-slug-custom' });

      expect(mockProductsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'mi-slug-custom' }),
      );
    });

    it('should generate slug by normalizing accents and special characters', async () => {
      await service.create({ ...createDto, name: 'Señalización & Rótulo' });

      const callArg = mockProductsRepository.create.mock.calls[0][0];
      expect(callArg.slug).toBe('senalizacion-rotulo');
    });

    it('should convert basePrice to Prisma.Decimal when provided', async () => {
      await service.create(createDto);

      const callArg = mockProductsRepository.create.mock.calls[0][0];
      expect(callArg.basePrice).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.basePrice.toString())).toBe(250);
    });

    it('should set basePrice to null when not provided', async () => {
      const { basePrice: _, ...dtoWithoutPrice } = createDto;
      await service.create(dtoWithoutPrice as any);

      const callArg = mockProductsRepository.create.mock.calls[0][0];
      expect(callArg.basePrice).toBeNull();
    });

    it('should connect category via relation', async () => {
      await service.create(createDto);

      expect(mockProductsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: { connect: { id: 'cat-1' } },
        }),
      );
    });

    it('should throw BadRequestException when slug already exists', async () => {
      mockProductsRepository.findBySlug.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un producto con el slug "logo-corporativo"`,
      );
      expect(mockProductsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when name already exists in the same category', async () => {
      mockProductsRepository.findByNameAndCategory.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un producto con el nombre "${createDto.name}" en esta categoría`,
      );
      expect(mockProductsRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockProductsRepository.findById.mockResolvedValue(mockProduct);
      mockProductsRepository.findBySlugExcludingId.mockResolvedValue(null);
      mockProductsRepository.findByNameAndCategoryExcludingId.mockResolvedValue(null);
      mockProductsRepository.update.mockResolvedValue({
        ...mockProduct,
        description: 'Updated description',
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductsRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockProductsRepository.update).not.toHaveBeenCalled();
    });

    it('should update product and return result', async () => {
      const result = await service.update('prod-1', { description: 'Updated description' });

      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({ description: 'Updated description' }),
      );
      expect(result).toMatchObject({ id: 'prod-1' });
    });

    it('should auto-regenerate slug when name is updated without explicit slug', async () => {
      await service.update('prod-1', { name: 'Nuevo Producto' });

      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({ slug: 'nuevo-producto' }),
      );
    });

    it('should NOT auto-regenerate slug when name and slug are both provided', async () => {
      await service.update('prod-1', { name: 'Nuevo Producto', slug: 'mi-slug' });

      const callArg = mockProductsRepository.update.mock.calls[0][1];
      expect(callArg.slug).toBe('mi-slug');
    });

    it('should throw BadRequestException when new slug is already used by another product', async () => {
      mockProductsRepository.findBySlugExcludingId.mockResolvedValue({ id: 'other' });

      await expect(
        service.update('prod-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('prod-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(`Ya existe un producto con el slug "taken-slug"`);
    });

    it('should throw BadRequestException when name is already used in the same category by another product', async () => {
      mockProductsRepository.findByNameAndCategoryExcludingId.mockResolvedValue({ id: 'other' });

      await expect(
        service.update('prod-1', { name: 'Logo Corporativo' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('prod-1', { name: 'Logo Corporativo' }),
      ).rejects.toThrow('en esta categoría');
    });

    it('should convert basePrice to Prisma.Decimal when updating price', async () => {
      await service.update('prod-1', { basePrice: 300 });

      const callArg = mockProductsRepository.update.mock.calls[0][1];
      expect(callArg.basePrice).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.basePrice.toString())).toBe(300);
    });

    it('should set basePrice to null when updating with null value', async () => {
      await service.update('prod-1', { basePrice: null as any });

      const callArg = mockProductsRepository.update.mock.calls[0][1];
      expect(callArg.basePrice).toBeNull();
    });

    it('should connect category via relation when categoryId is updated', async () => {
      await service.update('prod-1', { categoryId: 'cat-2' });

      const callArg = mockProductsRepository.update.mock.calls[0][1];
      expect(callArg.category).toEqual({ connect: { id: 'cat-2' } });
    });

    it('should not check slug uniqueness when slug is not being updated', async () => {
      await service.update('prod-1', { description: 'Only description' });

      expect(mockProductsRepository.findBySlugExcludingId).not.toHaveBeenCalled();
    });

    it('should check per-category uniqueness using current category when only name changes', async () => {
      await service.update('prod-1', { name: 'Nuevo Nombre' });

      expect(mockProductsRepository.findByNameAndCategoryExcludingId).toHaveBeenCalledWith(
        'Nuevo Nombre',
        'cat-1', // current category from mockProduct
        'prod-1',
      );
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete product (isActive=false) and return success message', async () => {
      mockProductsRepository.findById.mockResolvedValue(mockProduct);
      mockProductsRepository.update.mockResolvedValue({});

      const result = await service.remove('prod-1');

      expect(mockProductsRepository.update).toHaveBeenCalledWith('prod-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Producto con ID prod-1 eliminado correctamente',
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductsRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockProductsRepository.update).not.toHaveBeenCalled();
    });
  });
});
