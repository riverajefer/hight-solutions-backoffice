import { Test, TestingModule } from '@nestjs/testing';
import { CommercialChannelsController } from './commercial-channels.controller';
import { CommercialChannelsService } from './commercial-channels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockCommercialChannelsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CommercialChannelsController', () => {
  let controller: CommercialChannelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommercialChannelsController],
      providers: [{ provide: CommercialChannelsService, useValue: mockCommercialChannelsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<CommercialChannelsController>(CommercialChannelsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      mockCommercialChannelsService.findAll.mockResolvedValue([]);
      expect(await controller.findAll()).toEqual([]);
      expect(mockCommercialChannelsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      mockCommercialChannelsService.findOne.mockResolvedValue({ id: 'ch-1' });
      expect(await controller.findOne('ch-1')).toEqual({ id: 'ch-1' });
      expect(mockCommercialChannelsService.findOne).toHaveBeenCalledWith('ch-1');
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Venta Directa' } as any;
      mockCommercialChannelsService.create.mockResolvedValue({ id: 'ch-1', ...dto });
      await controller.create(dto);
      expect(mockCommercialChannelsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Venta Online' } as any;
      mockCommercialChannelsService.update.mockResolvedValue({ id: 'ch-1', ...dto });
      await controller.update('ch-1', dto);
      expect(mockCommercialChannelsService.update).toHaveBeenCalledWith('ch-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockCommercialChannelsService.remove.mockResolvedValue({ id: 'ch-1' });
      await controller.remove('ch-1');
      expect(mockCommercialChannelsService.remove).toHaveBeenCalledWith('ch-1');
    });
  });
});
