import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SupplyCategoriesService } from './supply-categories.service';
import { SupplyCategoriesRepository } from './supply-categories.repository';

const mockSupplyCategoriesRepository = {
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

describe('SupplyCategoriesService', () => {
  let service: SupplyCategoriesService;

  const mockCategory = {
    id: 'scat-1',
    name: 'Materiales de Limpieza',
    slug: 'materiales-de-limpieza',
    description: 'Insumos de limpieza',
    icon: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyCategoriesService,
        { provide: SupplyCategoriesRepository, useValue: mockSupplyCategoriesRepository },
      ],
    }).compile();

    service = module.get<SupplyCategoriesService>(SupplyCategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockSupplyCategoriesRepository.findAll.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(mockSupplyCategoriesRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockCategory]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockSupplyCategoriesRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockSupplyCategoriesRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return category when found', async () => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.findOne('scat-1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Categoría de insumo con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Materiales de Limpieza',
      description: 'Insumos de limpieza',
    };

    beforeEach(() => {
      mockSupplyCategoriesRepository.findByName.mockResolvedValue(null);
      mockSupplyCategoriesRepository.findBySlug.mockResolvedValue(null);
      mockSupplyCategoriesRepository.create.mockResolvedValue(mockCategory);
    });

    it('should create category with auto-generated slug from name', async () => {
      await service.create(createDto);

      expect(mockSupplyCategoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          slug: 'materiales-de-limpieza',
        }),
      );
    });

    it('should use provided slug when given explicitly', async () => {
      await service.create({ ...createDto, slug: 'mi-slug-custom' });

      expect(mockSupplyCategoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'mi-slug-custom' }),
      );
    });

    it('should generate slug by normalizing accents and special characters', async () => {
      await service.create({ name: 'Café & Papelería', description: 'Test' });

      const callArg = mockSupplyCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.slug).toBe('cafe-papeleria');
    });

    it('should use sortOrder=0 by default when not provided', async () => {
      await service.create(createDto);

      const callArg = mockSupplyCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.sortOrder).toBe(0);
    });

    it('should use provided sortOrder', async () => {
      await service.create({ ...createDto, sortOrder: 3 });

      const callArg = mockSupplyCategoriesRepository.create.mock.calls[0][0];
      expect(callArg.sortOrder).toBe(3);
    });

    it('should throw BadRequestException when name already exists', async () => {
      mockSupplyCategoriesRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una categoría de insumo con el nombre "${createDto.name}"`,
      );
      expect(mockSupplyCategoriesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when slug already exists', async () => {
      mockSupplyCategoriesRepository.findBySlug.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una categoría de insumo con el slug "materiales-de-limpieza"`,
      );
      expect(mockSupplyCategoriesRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(mockCategory);
      mockSupplyCategoriesRepository.findByNameExcludingId.mockResolvedValue(null);
      mockSupplyCategoriesRepository.findBySlugExcludingId.mockResolvedValue(null);
      mockSupplyCategoriesRepository.update.mockResolvedValue({
        ...mockCategory,
        name: 'Updated Name',
        slug: 'updated-name',
      });
    });

    it('should update category and return result', async () => {
      await service.update('scat-1', { description: 'Nueva descripción' });

      expect(mockSupplyCategoriesRepository.update).toHaveBeenCalledWith(
        'scat-1',
        expect.objectContaining({ description: 'Nueva descripción' }),
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockSupplyCategoriesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new name is already used by another category', async () => {
      mockSupplyCategoriesRepository.findByNameExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('scat-1', { name: 'Taken' })).rejects.toThrow(BadRequestException);
      await expect(service.update('scat-1', { name: 'Taken' })).rejects.toThrow(
        `Ya existe una categoría de insumo con el nombre "Taken"`,
      );
    });

    it('should throw BadRequestException when slug is already used by another category', async () => {
      mockSupplyCategoriesRepository.findBySlugExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('scat-1', { slug: 'taken-slug' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('scat-1', { slug: 'taken-slug' })).rejects.toThrow(
        `Ya existe una categoría de insumo con el slug "taken-slug"`,
      );
    });

    it('should auto-regenerate slug when name is updated without explicit slug', async () => {
      await service.update('scat-1', { name: 'Nueva Categoría' });

      expect(mockSupplyCategoriesRepository.update).toHaveBeenCalledWith(
        'scat-1',
        expect.objectContaining({ slug: 'nueva-categoria' }),
      );
    });

    it('should NOT auto-regenerate slug when name and slug are both provided', async () => {
      await service.update('scat-1', { name: 'Nueva Categoría', slug: 'mi-slug' });

      const callArg = mockSupplyCategoriesRepository.update.mock.calls[0][1];
      expect(callArg.slug).toBe('mi-slug');
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('scat-1', { description: 'Only description' });

      expect(mockSupplyCategoriesRepository.findByNameExcludingId).not.toHaveBeenCalled();
    });

    it('should not check slug uniqueness when slug is not explicitly provided', async () => {
      await service.update('scat-1', { description: 'Only description' });

      expect(mockSupplyCategoriesRepository.findBySlugExcludingId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete category (isActive=false) and return success message', async () => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(mockCategory);
      mockSupplyCategoriesRepository.update.mockResolvedValue({});

      const result = await service.remove('scat-1');

      expect(mockSupplyCategoriesRepository.update).toHaveBeenCalledWith('scat-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Categoría de insumo con ID scat-1 eliminada correctamente',
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockSupplyCategoriesRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockSupplyCategoriesRepository.update).not.toHaveBeenCalled();
    });
  });
});
