import { Test, TestingModule } from '@nestjs/testing';
import { StepDefinitionsService } from './step-definitions.service';
import { ProductionRepository } from './production.repository';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

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
    it('should normalize type to uppercase and create', async () => {
      repo.findStepDefinitionByType.mockResolvedValue(null);
      repo.createStepDefinition.mockResolvedValue({ id: '1', type: 'S1' } as any);
      await service.create({ type: 's1', name: 'S1' } as any);
      expect(repo.findStepDefinitionByType).toHaveBeenCalledWith('S1');
      expect(repo.createStepDefinition).toHaveBeenCalledWith(expect.objectContaining({ type: 'S1' }));
    });

    it('should throw ConflictException if type already exists', async () => {
      repo.findStepDefinitionByType.mockResolvedValue({ id: 'existing', type: 'S1' } as any);
      await expect(service.create({ type: 's1', name: 'S1' } as any)).rejects.toThrow('Ya existe');
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
      repo.findStepDefinitionWithOrderSteps.mockResolvedValue({ id: '1', productionOrderSteps: [] });

      const res = await service.updateFieldSchema('1', { fieldSchema: { fields: [] } } as any);
      expect(res.fieldSchema).toEqual({ fields: [] });
      expect(repo.updateStepDefinitionFieldSchema).toHaveBeenCalledWith('1', { fields: [] });
    });

    it('should throw NotFoundException if step definition not found', async () => {
      repo.findStepDefinitionById.mockResolvedValue(null);
      await expect(service.updateFieldSchema('1', { fieldSchema: { fields: [] } } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on duplicate field keys', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      const dto = {
        fieldSchema: {
          fields: [
            { key: 'color', label: 'Color', type: 'text', stage: 'execution', required: true },
            { key: 'color', label: 'Color 2', type: 'text', stage: 'execution', required: false },
          ],
        },
      } as any;
      await expect(service.updateFieldSchema('1', dto)).rejects.toThrow('claves duplicadas');
    });

    it('should normalize order field based on position', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      repo.updateStepDefinitionFieldSchema.mockResolvedValue({ id: '1', fieldSchema: { fields: [] } } as any);
      repo.findStepDefinitionWithOrderSteps.mockResolvedValue({ id: '1', productionOrderSteps: [] });

      const dto = {
        fieldSchema: {
          fields: [
            { key: 'a', label: 'A', type: 'text', stage: 'spec', required: true },
            { key: 'b', label: 'B', type: 'text', stage: 'spec', required: true },
          ],
        },
      } as any;
      await service.updateFieldSchema('1', dto);
      expect(repo.updateStepDefinitionFieldSchema).toHaveBeenCalledWith('1', {
        fields: [
          expect.objectContaining({ key: 'a', order: 0 }),
          expect.objectContaining({ key: 'b', order: 1 }),
        ],
      });
    });

    it('should add warning when existing production steps exist', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      repo.updateStepDefinitionFieldSchema.mockResolvedValue({ id: '1', fieldSchema: { fields: [] } } as any);
      repo.findStepDefinitionWithOrderSteps.mockResolvedValue({ id: '1', productionOrderSteps: [{ id: 'step1' }] });

      const res = await service.updateFieldSchema('1', { fieldSchema: { fields: [] } } as any);
      expect(res.warning).toBeDefined();
      expect(res.warning).toContain('datos ya ingresados');
    });

    it('should not add warning when no production steps exist', async () => {
      repo.findStepDefinitionById.mockResolvedValue({ id: '1' } as any);
      repo.updateStepDefinitionFieldSchema.mockResolvedValue({ id: '1', fieldSchema: { fields: [] } } as any);
      repo.findStepDefinitionWithOrderSteps.mockResolvedValue({ id: '1', productionOrderSteps: [] });

      const res = await service.updateFieldSchema('1', { fieldSchema: { fields: [] } } as any);
      expect(res.warning).toBeUndefined();
    });
  });
});
