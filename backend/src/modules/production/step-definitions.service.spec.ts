import { Test, TestingModule } from '@nestjs/testing';
import { StepDefinitionsService } from './step-definitions.service';
import { ProductionRepository } from './production.repository';
import { NotFoundException } from '@nestjs/common';

describe('StepDefinitionsService', () => {
  let service: StepDefinitionsService;
  let repo: jest.Mocked<ProductionRepository>;

  const mockRepo = {
    createStepDefinition: jest.fn(),
    findAllStepDefinitions: jest.fn(),
    findStepDefinitionById: jest.fn(),
    updateStepDefinitionFieldSchema: jest.fn(),
    findStepDefinitionByType: jest.fn(),
    findStepDefinitionWithOrderSteps: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepDefinitionsService,
        { provide: ProductionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<StepDefinitionsService>(StepDefinitionsService);
    repo = module.get(ProductionRepository) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repo.createStepDefinition', async () => {
      repo.createStepDefinition.mockResolvedValue({ id: '1' } as any);
      await service.create({ type: 'S1', name: 'S1', category: 'C', estimatedMinutes: 10, roleRequired: 'R' } as any);
      expect(repo.createStepDefinition).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('findAll', () => {
    it('should return all definitions', async () => {
      repo.findAllStepDefinitions.mockResolvedValue([]);
      const res = await service.findAll();
      expect(res).toEqual([]);
      expect(repo.findAllStepDefinitions).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a definition', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      const res = await service.findOne('1');
      expect(res).toEqual({ id: '1' });
      expect(repo.findStepDefinitionById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findStepDefinitionById.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFieldSchema', () => {
    it('should update fieldSchema', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      repo.updateStepDefinitionFieldSchema.mockResolvedValue({ id: '1', fieldSchema: { fields: [] } } as any);
      
      const res = await service.updateFieldSchema('1', { fieldSchema: { fields: [] } } as any);
      expect(res.fieldSchema).toEqual({ fields: [] });
      expect(repo.updateStepDefinitionFieldSchema).toHaveBeenCalledWith('1', { fields: [] });
    });
  });
});
