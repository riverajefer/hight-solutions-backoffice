import { Test, TestingModule } from '@nestjs/testing';
import { StepDefinitionsController } from './step-definitions.controller';
import { StepDefinitionsService } from './step-definitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('StepDefinitionsController', () => {
  let controller: StepDefinitionsController;
  let service: jest.Mocked<StepDefinitionsService>;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateFieldSchema: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StepDefinitionsController],
      providers: [
        {
          provide: StepDefinitionsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StepDefinitionsController>(StepDefinitionsController);
    service = module.get(StepDefinitionsService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      service.create.mockResolvedValue({ id: '1' } as any);
      const dto = { name: 'S1', category: 'C' } as any;
      await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      service.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: '1' } as any);
      await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('updateFieldSchema', () => {
    it('should call service.updateFieldSchema', async () => {
      service.updateFieldSchema.mockResolvedValue({ id: '1' } as any);
      await controller.updateFieldSchema('1', { fieldSchema: {} as any });
      expect(service.updateFieldSchema).toHaveBeenCalledWith('1', { fieldSchema: {} as any });
    });
  });
});
