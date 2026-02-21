import { Test, TestingModule } from '@nestjs/testing';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockAreasService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('AreasController', () => {
  let controller: AreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [{ provide: AreasService, useValue: mockAreasService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AreasController>(AreasController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call areasService.findAll with false by default', async () => {
      mockAreasService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockAreasService.findAll).toHaveBeenCalledWith(false);
    });
    it('should call areasService.findAll with true when query is "true"', async () => {
      mockAreasService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockAreasService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should delegate to areasService.findOne', async () => {
      mockAreasService.findOne.mockResolvedValue({ id: 'area-1' });
      const result = await controller.findOne('area-1');
      expect(mockAreasService.findOne).toHaveBeenCalledWith('area-1');
      expect(result).toEqual({ id: 'area-1' });
    });
  });

  describe('create', () => {
    it('should delegate to areasService.create', async () => {
      const dto = { name: 'Producción' } as any;
      mockAreasService.create.mockResolvedValue({ id: 'area-1', ...dto });
      await controller.create(dto);
      expect(mockAreasService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to areasService.update', async () => {
      const dto = { name: 'Producción 2' } as any;
      mockAreasService.update.mockResolvedValue({ id: 'area-1', ...dto });
      await controller.update('area-1', dto);
      expect(mockAreasService.update).toHaveBeenCalledWith('area-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to areasService.remove', async () => {
      mockAreasService.remove.mockResolvedValue({ id: 'area-1' });
      await controller.remove('area-1');
      expect(mockAreasService.remove).toHaveBeenCalledWith('area-1');
    });
  });
});
