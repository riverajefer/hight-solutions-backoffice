import { Test, TestingModule } from '@nestjs/testing';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockCargosService = {
  findAll: jest.fn(),
  findByArea: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CargosController', () => {
  let controller: CargosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CargosController],
      providers: [{ provide: CargosService, useValue: mockCargosService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<CargosController>(CargosController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call cargosService.findAll with false when no query', async () => {
      mockCargosService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockCargosService.findAll).toHaveBeenCalledWith(false);
    });
    it('should call cargosService.findAll with true when query is "true"', async () => {
      mockCargosService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockCargosService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findByArea', () => {
    it('should call cargosService.findByArea with areaId and false by default', async () => {
      mockCargosService.findByArea.mockResolvedValue([]);
      await controller.findByArea('area-1', undefined);
      expect(mockCargosService.findByArea).toHaveBeenCalledWith('area-1', false);
    });
    it('should pass true when includeInactive is "true"', async () => {
      mockCargosService.findByArea.mockResolvedValue([]);
      await controller.findByArea('area-1', 'true');
      expect(mockCargosService.findByArea).toHaveBeenCalledWith('area-1', true);
    });
  });

  describe('findOne', () => {
    it('should delegate to cargosService.findOne', async () => {
      mockCargosService.findOne.mockResolvedValue({ id: 'cargo-1' });
      expect(await controller.findOne('cargo-1')).toEqual({ id: 'cargo-1' });
      expect(mockCargosService.findOne).toHaveBeenCalledWith('cargo-1');
    });
  });

  describe('create', () => {
    it('should delegate to cargosService.create', async () => {
      const dto = { name: 'Operario' } as any;
      mockCargosService.create.mockResolvedValue({ id: 'cargo-1', ...dto });
      await controller.create(dto);
      expect(mockCargosService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to cargosService.update', async () => {
      const dto = { name: 'Supervisor' } as any;
      mockCargosService.update.mockResolvedValue({ id: 'cargo-1', ...dto });
      await controller.update('cargo-1', dto);
      expect(mockCargosService.update).toHaveBeenCalledWith('cargo-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to cargosService.remove', async () => {
      mockCargosService.remove.mockResolvedValue({ id: 'cargo-1' });
      await controller.remove('cargo-1');
      expect(mockCargosService.remove).toHaveBeenCalledWith('cargo-1');
    });
  });
});
