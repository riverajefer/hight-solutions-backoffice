import { Test, TestingModule } from '@nestjs/testing';
import { ProductionAreasController } from './production-areas.controller';
import { ProductionAreasService } from './production-areas.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockProductionAreasService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProductionAreasController', () => {
  let controller: ProductionAreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionAreasController],
      providers: [{ provide: ProductionAreasService, useValue: mockProductionAreasService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ProductionAreasController>(ProductionAreasController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call service.findAll with false by default', async () => {
      mockProductionAreasService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockProductionAreasService.findAll).toHaveBeenCalledWith(false);
    });
    it('should call service.findAll with true when query is "true"', async () => {
      mockProductionAreasService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockProductionAreasService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      mockProductionAreasService.findOne.mockResolvedValue({ id: 'pa-1' });
      expect(await controller.findOne('pa-1')).toEqual({ id: 'pa-1' });
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Serigrafía' } as any;
      mockProductionAreasService.create.mockResolvedValue({ id: 'pa-1', ...dto });
      await controller.create(dto);
      expect(mockProductionAreasService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Bordado' } as any;
      mockProductionAreasService.update.mockResolvedValue({ id: 'pa-1', ...dto });
      await controller.update('pa-1', dto);
      expect(mockProductionAreasService.update).toHaveBeenCalledWith('pa-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockProductionAreasService.remove.mockResolvedValue({ id: 'pa-1' });
      await controller.remove('pa-1');
      expect(mockProductionAreasService.remove).toHaveBeenCalledWith('pa-1');
    });
  });
});
