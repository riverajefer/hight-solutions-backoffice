import { Test, TestingModule } from '@nestjs/testing';
import { ProductTemplatesController } from './product-templates.controller';
import { ProductTemplatesService } from './product-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('ProductTemplatesController', () => {
  let controller: ProductTemplatesController;
  let service: jest.Mocked<ProductTemplatesService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductTemplatesController],
      providers: [
        {
          provide: ProductTemplatesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductTemplatesController>(ProductTemplatesController);
    service = module.get(ProductTemplatesService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct filters', async () => {
      service.findAll.mockResolvedValue([]);
      await controller.findAll('cat1', 'true');
      expect(service.findAll).toHaveBeenCalledWith({ category: 'cat1', isActive: true });
      
      await controller.findAll(undefined, undefined);
      expect(service.findAll).toHaveBeenCalledWith({ category: undefined, isActive: undefined });

      await controller.findAll(undefined, 'false');
      expect(service.findAll).toHaveBeenCalledWith({ category: undefined, isActive: false });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: '1' } as any);
      await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'T1', components: [] } as any;
      service.create.mockResolvedValue({ id: '1' } as any);
      await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'T2' } as any;
      service.update.mockResolvedValue({ id: '1' } as any);
      await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue({ id: '1' } as any);
      await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
