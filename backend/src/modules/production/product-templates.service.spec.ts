import { Test, TestingModule } from '@nestjs/testing';
import { ProductTemplatesService } from './product-templates.service';
import { ProductionRepository } from './production.repository';
import { NotFoundException } from '@nestjs/common';

describe('ProductTemplatesService', () => {
  let service: ProductTemplatesService;
  let repo: jest.Mocked<ProductionRepository>;

  const mockRepo = {
    findAllTemplates: jest.fn(),
    findTemplateById: jest.fn(),
    createTemplate: jest.fn(),
    createComponent: jest.fn(),
    createComponentStep: jest.fn(),
    updateTemplate: jest.fn(),
    deleteComponentsByTemplateId: jest.fn(),
    softDeleteTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductTemplatesService,
        { provide: ProductionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProductTemplatesService>(ProductTemplatesService);
    repo = module.get(ProductionRepository) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      repo.findAllTemplates.mockResolvedValue([]);
      const result = await service.findAll({});
      expect(result).toEqual([]);
      expect(repo.findAllTemplates).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a template if found', async () => {
      repo.findTemplateById.mockResolvedValue({ id: '1' } as any);
      const result = await service.findOne('1');
      expect(result).toEqual({ id: '1' });
      expect(repo.findTemplateById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findTemplateById.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a template with components', async () => {
      repo.createTemplate.mockResolvedValue({ id: '1' } as any);
      repo.createComponent.mockResolvedValue({ id: 'c1' } as any);
      repo.findTemplateById.mockResolvedValue({ id: '1' } as any);

      const dto = {
        name: 'T',
        category: 'C',
        description: 'D',
        components: [
          {
            name: 'C1', order: 1, phase: 'PRE', isRequired: true,
            steps: [{ stepDefinitionId: 's1', order: 1, isRequired: true }]
          }
        ]
      } as any;

      const result = await service.create(dto);
      expect(result).toEqual({ id: '1' });
      expect(repo.createTemplate).toHaveBeenCalled();
      expect(repo.createComponent).toHaveBeenCalled();
      expect(repo.createComponentStep).toHaveBeenCalled();
    });

    it('should handle steps with fieldOverrides', async () => {
      repo.createTemplate.mockResolvedValue({ id: '1' } as any);
      repo.createComponent.mockResolvedValue({ id: 'c1' } as any);
      repo.findTemplateById.mockResolvedValue({ id: '1' } as any);

      const dto = {
        name: 'T', category: 'C',
        components: [{
          name: 'C1', order: 1, phase: 'PRE', isRequired: true,
          steps: [
            { stepDefinitionId: 's1', order: 1, isRequired: true, fieldOverrides: { color: 'red' } },
            { stepDefinitionId: 's2', order: 2, isRequired: false },
          ],
        }],
      } as any;

      await service.create(dto);
      expect(repo.createComponentStep).toHaveBeenCalledWith(
        expect.objectContaining({ fieldOverrides: { color: 'red' } }),
      );
      expect(repo.createComponentStep).toHaveBeenCalledWith(
        expect.objectContaining({ fieldOverrides: null }),
      );
    });
  });

  describe('update', () => {
    it('should update a template and recreate components', async () => {
      repo.findTemplateById.mockResolvedValueOnce({ id: '1' } as any)
                           .mockResolvedValueOnce({ id: '1', updated: true } as any);
      repo.createComponent.mockResolvedValue({ id: 'c1' } as any);

      const dto = {
        name: 'T2',
        components: [
          { name: 'C1', order: 1, phase: 'PRE', isRequired: true, steps: [
            { stepDefinitionId: 's1', order: 1, isRequired: true }
          ] }
        ]
      } as any;

      const result = await service.update('1', dto);
      expect(repo.updateTemplate).toHaveBeenCalled();
      expect(repo.deleteComponentsByTemplateId).toHaveBeenCalledWith('1');
      expect(repo.createComponent).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', updated: true });
    });

    it('should update without components', async () => {
      repo.findTemplateById.mockResolvedValue({ id: '1' } as any);
      
      const dto = { name: 'T2' } as any;
      await service.update('1', dto);
      expect(repo.updateTemplate).toHaveBeenCalled();
      expect(repo.deleteComponentsByTemplateId).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a template', async () => {
      repo.findTemplateById.mockResolvedValue({ id: '1' } as any);
      repo.softDeleteTemplate.mockResolvedValue({ id: '1', deleted: true } as any);

      const result = await service.remove('1');
      expect(result).toEqual({ id: '1', deleted: true });
      expect(repo.softDeleteTemplate).toHaveBeenCalledWith('1');
    });
  });
});
