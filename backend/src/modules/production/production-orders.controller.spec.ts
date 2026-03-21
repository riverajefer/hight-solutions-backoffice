import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  let service: jest.Mocked<ProductionOrdersService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getProgress: jest.fn(),
    create: jest.fn(),
    updateSpecification: jest.fn(),
    updateExecution: jest.fn(),
    completeStep: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        {
          provide: ProductionOrdersService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductionOrdersController>(ProductionOrdersController);
    service = module.get(ProductionOrdersService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } as any });
      await controller.findAll({});
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: '1' } as any);
      await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('getProgress', () => {
    it('should call service.getProgress', async () => {
      service.getProgress.mockResolvedValue({} as any);
      await controller.getProgress('1');
      expect(service.getProgress).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      service.create.mockResolvedValue({ id: '1' } as any);
      await controller.create({} as any, 'u1');
      expect(service.create).toHaveBeenCalledWith({}, 'u1');
    });
  });
  
  describe('updateSpecification', () => {
    it('should call service.updateSpecification', async () => {
      service.updateSpecification.mockResolvedValue({} as any);
      await controller.updateSpecification('1', '2', { data: { foo: 'bar' } } as any);
      expect(service.updateSpecification).toHaveBeenCalledWith('1', '2', { foo: 'bar' });
    });
  });

  describe('updateExecution', () => {
    it('should call service.updateExecution', async () => {
      service.updateExecution.mockResolvedValue({} as any);
      await controller.updateExecution('1', '2', { data: { foo: 'bar' } } as any);
      expect(service.updateExecution).toHaveBeenCalledWith('1', '2', { foo: 'bar' });
    });
  });

  describe('completeStep', () => {
    it('should call service.completeStep', async () => {
      service.completeStep.mockResolvedValue({} as any);
      await controller.completeStep('1', '2', 'u1');
      expect(service.completeStep).toHaveBeenCalledWith('1', '2', 'u1');
    });
  });
});
