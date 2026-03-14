import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesRepository } from './product-categories.repository';

const mockProductCategoriesRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  findBySlug: jest.fn(),
  findBySlugExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;

  const mockCategory = {
    id: 'cat-1',
    name: 'Servicios de Diseño',
    slug: 'servicios-de-diseno',
    description: 'Categoría de diseño',
    icon: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        {
          provide: ProductCategoriesRepository,
          useValue: mockProductCategoriesRepository,
        },
      ],
    }).compile();

    service = module.get<ProductCategoriesService>(ProductCategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockProductCategoriesRepository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(mockProductCategoriesRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockCategory]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockProductCategoriesRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockProductCategoriesRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return category when found', async () => {
      mockProductCategoriesRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockProductCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Categoría de producto con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Servicios de Diseño',
      description: 'Categoría de diseño',
    };

    beforeEach(() => {
      mockProductCategoriesRepository.findByName.mockResolvedValue(null);
      mockProductCategoriesRepository.findBySlug.mockResolvedValue(null);
      mockProductCategoriesRepository.create.mockResolvedValue(mockCategory);
    });

    it('should create category with auto-generated slug from name', async () => {
      await service.create(createDto);

      expect(mockProductCategoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          slug: 'servicios-de-diseno',
        }),
      );
    });

    it('should use provided slug when given explicitly', async () => {
      await service.create({ ...createDto, slug: 'mi-slug-custom' });

      expect(mockProductCategoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'mi-slug-custom' }),
      );
    });

    it('should generate slug by normalizing accents and special characters', async () => {
      await service.create({ name: 'Café & Panadería', description: 'Test' });

      const callArg = mockProductCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.slug).toBe('cafe-panaderia');
    });

    it('should use sortOrder=0 by default', async () => {
      await service.create(createDto);

      const callArg = mockProductCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.sortOrder).toBe(0);
    });

    it('should use provided sortOrder', async () => {
      await service.create({ ...createDto, sortOrder: 5 });

      const callArg = mockProductCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.sortOrder).toBe(5);
    });

    it('should throw BadRequestException when name already exists', async () => {
      mockProductCategoriesRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una categoría de producto con el nombre "${createDto.name}"`,
      );
      expect(mockProductCategoriesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when slug already exists', async () => {
      mockProductCategoriesRepository.findBySlug.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una categoría de producto con el slug "servicios-de-diseno"`,
      );
      expect(mockProductCategoriesRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockProductCategoriesRepository.findById.mockResolvedValue(mockCategory);
      mockProductCategoriesRepository.findByNameExcludingId.mockResolvedValue(null);
      mockProductCategoriesRepository.findBySlugExcludingId.mockResolvedValue(null);
      mockProductCategoriesRepository.update.mockResolvedValue({
        ...mockCategory,
        name: 'Updated Name',
        slug: 'updated-name',
      });
    });

    it('should update category and return result', async () => {
      await service.update('cat-1', { description: 'Nueva descripción' });

      expect(mockProductCategoriesRepository.update).toHaveBeenCalledWith('cat-1', {
        description: 'Nueva descripción',
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockProductCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockProductCategoriesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new name is already used by another category', async () => {
      mockProductCategoriesRepository.findByNameExcludingId.mockResolvedValue({ id: 'other-cat' });

      await expect(service.update('cat-1', { name: 'Taken' })).rejects.toThrow(BadRequestException);
      await expect(service.update('cat-1', { name: 'Taken' })).rejects.toThrow(
        `Ya existe una categoría de producto con el nombre "Taken"`,
      );
    });

    it('should throw BadRequestException when slug is already used by another category', async () => {
      mockProductCategoriesRepository.findBySlugExcludingId.mockResolvedValue({ id: 'other-cat' });

      await expect(service.update('cat-1', { slug: 'taken-slug' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('cat-1', { slug: 'taken-slug' })).rejects.toThrow(
        `Ya existe una categoría de producto con el slug "taken-slug"`,
      );
    });

    it('should auto-regenerate slug when name is updated without explicit slug', async () => {
      await service.update('cat-1', { name: 'Nueva Categoría' });

      expect(mockProductCategoriesRepository.update).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ slug: 'nueva-categoria' }),
      );
    });

    it('should NOT auto-regenerate slug when name and slug are both provided', async () => {
      await service.update('cat-1', { name: 'Nueva Categoría', slug: 'mi-slug' });

      const callArg = mockProductCategoriesRepository.update.mock.calls[0][1];
      expect(callArg.slug).toBe('mi-slug');
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('cat-1', { description: 'Only description' });

      expect(mockProductCategoriesRepository.findByNameExcludingId).not.toHaveBeenCalled();
    });

    it('should not check slug uniqueness when slug is not being updated', async () => {
      await service.update('cat-1', { description: 'Only description' });

      expect(mockProductCategoriesRepository.findBySlugExcludingId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete category (isActive=false) and return success message', async () => {
      mockProductCategoriesRepository.findById.mockResolvedValue(mockCategory);
      mockProductCategoriesRepository.update.mockResolvedValue({});

      const result = await service.remove('cat-1');

      expect(mockProductCategoriesRepository.update).toHaveBeenCalledWith('cat-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Categoría de producto con ID cat-1 eliminada correctamente',
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockProductCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockProductCategoriesRepository.update).not.toHaveBeenCalled();
    });
  });
});
