import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockSuppliersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('SuppliersController', () => {
  let controller: SuppliersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: mockSuppliersService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<SuppliersController>(SuppliersController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call suppliersService.findAll with false by default', async () => {
      mockSuppliersService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(false);
    });
    it('should call suppliersService.findAll with true when query is "true"', async () => {
      mockSuppliersService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should delegate to suppliersService.findOne', async () => {
      mockSuppliersService.findOne.mockResolvedValue({ id: 'supplier-1' });
      expect(await controller.findOne('supplier-1')).toEqual({ id: 'supplier-1' });
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith('supplier-1');
    });
  });

  describe('create', () => {
    it('should delegate to suppliersService.create', async () => {
      const dto = { name: 'Proveedor XYZ', email: 'xyz@test.com' } as any;
      mockSuppliersService.create.mockResolvedValue({ id: 'supplier-1', ...dto });
      await controller.create(dto);
      expect(mockSuppliersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to suppliersService.update', async () => {
      const dto = { name: 'Proveedor ABC' } as any;
      mockSuppliersService.update.mockResolvedValue({ id: 'supplier-1', ...dto });
      await controller.update('supplier-1', dto);
      expect(mockSuppliersService.update).toHaveBeenCalledWith('supplier-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to suppliersService.remove', async () => {
      mockSuppliersService.remove.mockResolvedValue({ id: 'supplier-1' });
      await controller.remove('supplier-1');
      expect(mockSuppliersService.remove).toHaveBeenCalledWith('supplier-1');
    });
  });
});
