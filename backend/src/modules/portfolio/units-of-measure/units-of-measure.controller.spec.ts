import { Test, TestingModule } from '@nestjs/testing';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';

const mockUnitsOfMeasureService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUnit = {
  id: 'uom-1',
  name: 'Metro',
  abbreviation: 'm',
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

describe('UnitsOfMeasureController', () => {
  let controller: UnitsOfMeasureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsOfMeasureController],
      providers: [{ provide: UnitsOfMeasureService, useValue: mockUnitsOfMeasureService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UnitsOfMeasureController>(UnitsOfMeasureController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate with includeInactive=false when param is absent', async () => {
      mockUnitsOfMeasureService.findAll.mockResolvedValue([mockUnit]);

      await controller.findAll(undefined);

      expect(mockUnitsOfMeasureService.findAll).toHaveBeenCalledWith(false);
    });

    it('should delegate with includeInactive=true when param is "true"', async () => {
      mockUnitsOfMeasureService.findAll.mockResolvedValue([mockUnit]);

      await controller.findAll('true');

      expect(mockUnitsOfMeasureService.findAll).toHaveBeenCalledWith(true);
    });

    it('should delegate with includeInactive=false when param is "false"', async () => {
      mockUnitsOfMeasureService.findAll.mockResolvedValue([mockUnit]);

      await controller.findAll('false');

      expect(mockUnitsOfMeasureService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with the given id', async () => {
      mockUnitsOfMeasureService.findOne.mockResolvedValue(mockUnit);

      const result = await controller.findOne('uom-1');

      expect(mockUnitsOfMeasureService.findOne).toHaveBeenCalledWith('uom-1');
      expect(result).toEqual(mockUnit);
    });
  });

  describe('create', () => {
    it('should delegate to service with the dto', async () => {
      const dto = { name: 'Kilogramo', abbreviation: 'kg' } as any;
      mockUnitsOfMeasureService.create.mockResolvedValue({ id: 'uom-2', ...dto });

      const result = await controller.create(dto);

      expect(mockUnitsOfMeasureService.create).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ name: 'Kilogramo' });
    });
  });

  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { name: 'Metro lineal' } as any;
      mockUnitsOfMeasureService.update.mockResolvedValue({ ...mockUnit, ...dto });

      await controller.update('uom-1', dto);

      expect(mockUnitsOfMeasureService.update).toHaveBeenCalledWith('uom-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service with id', async () => {
      mockUnitsOfMeasureService.remove.mockResolvedValue({ ...mockUnit, isActive: false });

      await controller.remove('uom-1');

      expect(mockUnitsOfMeasureService.remove).toHaveBeenCalledWith('uom-1');
    });
  });
});
