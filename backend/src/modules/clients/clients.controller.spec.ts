import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockClientsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateSpecialCondition: jest.fn(),
  remove: jest.fn(),
  uploadClients: jest.fn(),
};

describe('ClientsController', () => {
  let controller: ClientsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockClientsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call clientsService.findAll with false by default', async () => {
      mockClientsService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined);
      expect(mockClientsService.findAll).toHaveBeenCalledWith(false);
    });
    it('should call clientsService.findAll with true when query is "true"', async () => {
      mockClientsService.findAll.mockResolvedValue([]);
      await controller.findAll('true');
      expect(mockClientsService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('should delegate to clientsService.findOne', async () => {
      mockClientsService.findOne.mockResolvedValue({ id: 'client-1' });
      expect(await controller.findOne('client-1')).toEqual({ id: 'client-1' });
      expect(mockClientsService.findOne).toHaveBeenCalledWith('client-1');
    });
  });

  describe('create', () => {
    it('should delegate to clientsService.create', async () => {
      const dto = { name: 'Empresa ABC', email: 'abc@test.com' } as any;
      mockClientsService.create.mockResolvedValue({ id: 'client-1', ...dto });
      await controller.create(dto);
      expect(mockClientsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to clientsService.update', async () => {
      const dto = { name: 'Empresa XYZ' } as any;
      mockClientsService.update.mockResolvedValue({ id: 'client-1', ...dto });
      await controller.update('client-1', dto);
      expect(mockClientsService.update).toHaveBeenCalledWith('client-1', dto);
    });
  });

  describe('updateSpecialCondition', () => {
    it('should delegate to clientsService.updateSpecialCondition', async () => {
      const body = { specialCondition: 'Descuento 15%' } as any;
      mockClientsService.updateSpecialCondition.mockResolvedValue({ id: 'client-1' });
      await controller.updateSpecialCondition('client-1', body);
      expect(mockClientsService.updateSpecialCondition).toHaveBeenCalledWith('client-1', 'Descuento 15%');
    });
  });

  describe('remove', () => {
    it('should delegate to clientsService.remove', async () => {
      mockClientsService.remove.mockResolvedValue({ id: 'client-1' });
      await controller.remove('client-1');
      expect(mockClientsService.remove).toHaveBeenCalledWith('client-1');
    });
  });

  describe('uploadClients', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadClients(undefined as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException for non-CSV files', async () => {
      const file = { originalname: 'data.xlsx', buffer: Buffer.from('') } as any;
      await expect(controller.uploadClients(file)).rejects.toThrow(BadRequestException);
    });
    it('should delegate to clientsService.uploadClients with CSV buffer', async () => {
      const buffer = Buffer.from('name,email\nCliente,c@t.com');
      const file = { originalname: 'clients.csv', buffer } as any;
      mockClientsService.uploadClients.mockResolvedValue({ created: 1, errors: [] });
      const result = await controller.uploadClients(file);
      expect(mockClientsService.uploadClients).toHaveBeenCalledWith(buffer);
      expect(result).toEqual({ created: 1, errors: [] });
    });
  });
});
