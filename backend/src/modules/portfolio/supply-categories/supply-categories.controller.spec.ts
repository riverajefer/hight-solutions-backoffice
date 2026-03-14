import { Test, TestingModule } from '@nestjs/testing';
import { SupplyCategoriesController } from './supply-categories.controller';
import { SupplyCategoriesService } from './supply-categories.service';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';

const mockSupplyCategoriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('SupplyCategoriesController', () => {
  let controller: SupplyCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplyCategoriesController],
      providers: [{ provide: SupplyCategoriesService, useValue: mockSupplyCategoriesService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<SupplyCategoriesController>(SupplyCategoriesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call service.findAll with false by default', async () => {
      mockSupplyCategoriesService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockSupplyCategoriesService.findAll).toHaveBeenCalledWith(false);
    });
    it('should pass includeInactive=true when query is "true"', async () => {
      mockSupplyCategoriesService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockSupplyCategoriesService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      mockSupplyCategoriesService.findOne.mockResolvedValue({ id: 'cat-1' });
      expect(await controller.findOne('cat-1')).toEqual({ id: 'cat-1' });
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Tintas', slug: 'tintas' } as any;
      mockSupplyCategoriesService.create.mockResolvedValue({ id: 'cat-1', ...dto });
      await controller.create(dto);
      expect(mockSupplyCategoriesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Tintas UV' } as any;
      mockSupplyCategoriesService.update.mockResolvedValue({ id: 'cat-1', ...dto });
      await controller.update('cat-1', dto);
      expect(mockSupplyCategoriesService.update).toHaveBeenCalledWith('cat-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockSupplyCategoriesService.remove.mockResolvedValue({ id: 'cat-1' });
      await controller.remove('cat-1');
      expect(mockSupplyCategoriesService.remove).toHaveBeenCalledWith('cat-1');
    });
  });
});
