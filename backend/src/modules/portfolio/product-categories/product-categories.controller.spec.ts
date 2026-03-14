import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';

const mockProductCategoriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockCategory = {
  id: 'cat-1',
  name: 'Ropa Deportiva',
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

describe('ProductCategoriesController', () => {
  let controller: ProductCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCategoriesController],
      providers: [{ provide: ProductCategoriesService, useValue: mockProductCategoriesService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductCategoriesController>(ProductCategoriesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate to service with includeInactive=false when param is absent', async () => {
      mockProductCategoriesService.findAll.mockResolvedValue([mockCategory]);

      await controller.findAll(undefined);

      expect(mockProductCategoriesService.findAll).toHaveBeenCalledWith(false);
    });

    it('should delegate with includeInactive=true when param is "true"', async () => {
      mockProductCategoriesService.findAll.mockResolvedValue([mockCategory]);

      await controller.findAll('true');

      expect(mockProductCategoriesService.findAll).toHaveBeenCalledWith(true);
    });

    it('should delegate with includeInactive=false when param is "false"', async () => {
      mockProductCategoriesService.findAll.mockResolvedValue([mockCategory]);

      await controller.findAll('false');

      expect(mockProductCategoriesService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with the given id', async () => {
      mockProductCategoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('cat-1');

      expect(mockProductCategoriesService.findOne).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(mockCategory);
    });
  });

  describe('create', () => {
    it('should delegate to service with the dto', async () => {
      const dto = { name: 'Nueva Categoría' } as any;
      mockProductCategoriesService.create.mockResolvedValue({ id: 'cat-2', ...dto });

      const result = await controller.create(dto);

      expect(mockProductCategoriesService.create).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ name: 'Nueva Categoría' });
    });
  });

  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { name: 'Categoría Actualizada' } as any;
      mockProductCategoriesService.update.mockResolvedValue({ ...mockCategory, ...dto });

      await controller.update('cat-1', dto);

      expect(mockProductCategoriesService.update).toHaveBeenCalledWith('cat-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service with id', async () => {
      mockProductCategoriesService.remove.mockResolvedValue({ ...mockCategory, isActive: false });

      await controller.remove('cat-1');

      expect(mockProductCategoriesService.remove).toHaveBeenCalledWith('cat-1');
    });
  });
});
