import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';

const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ProductsController>(ProductsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call service.findAll with false and no categoryId by default', async () => {
      mockProductsService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined, undefined);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(false, undefined);
    });
    it('should pass includeInactive=true when query is "true"', async () => {
      mockProductsService.findAll.mockResolvedValue([]);
      await controller.findAll('true', 'cat-1');
      expect(mockProductsService.findAll).toHaveBeenCalledWith(true, 'cat-1');
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      mockProductsService.findOne.mockResolvedValue({ id: 'prod-1' });
      expect(await controller.findOne('prod-1')).toEqual({ id: 'prod-1' });
      expect(mockProductsService.findOne).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Camiseta', categoryId: 'cat-1' } as any;
      mockProductsService.create.mockResolvedValue({ id: 'prod-1', ...dto });
      await controller.create(dto);
      expect(mockProductsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Camiseta Actualizada' } as any;
      mockProductsService.update.mockResolvedValue({ id: 'prod-1', ...dto });
      await controller.update('prod-1', dto);
      expect(mockProductsService.update).toHaveBeenCalledWith('prod-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockProductsService.remove.mockResolvedValue({ id: 'prod-1' });
      await controller.remove('prod-1');
      expect(mockProductsService.remove).toHaveBeenCalledWith('prod-1');
    });
  });
});
