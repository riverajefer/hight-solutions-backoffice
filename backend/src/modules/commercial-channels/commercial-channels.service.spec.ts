import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommercialChannelsService } from './commercial-channels.service';
import { CommercialChannelsRepository } from './commercial-channels.repository';

const mockRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CommercialChannelsService', () => {
  let service: CommercialChannelsService;

  const mockChannel = {
    id: 'channel-1',
    name: 'Tienda Virtual',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialChannelsService,
        { provide: CommercialChannelsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CommercialChannelsService>(CommercialChannelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository.findAll', async () => {
      mockRepository.findAll.mockResolvedValue([mockChannel]);

      const result = await service.findAll();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockChannel]);
    });

    it('should return empty array when no channels exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return channel when found', async () => {
      mockRepository.findById.mockResolvedValue(mockChannel);

      const result = await service.findOne('channel-1');

      expect(result).toEqual(mockChannel);
      expect(mockRepository.findById).toHaveBeenCalledWith('channel-1');
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Canal comercial con ID bad-id no encontrado',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = { name: 'Tienda Virtual' };

    it('should create channel when name is unique', async () => {
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockChannel);

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when name already exists', async () => {
      mockRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `El canal comercial con el nombre "${createDto.name}" ya existe`,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(mockChannel);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({ ...mockChannel, name: 'Nuevo Nombre' });
    });

    it('should update channel and return result', async () => {
      const result = await service.update('channel-1', { name: 'Nuevo Nombre' });

      expect(mockRepository.update).toHaveBeenCalledWith('channel-1', { name: 'Nuevo Nombre' });
      expect(result).toMatchObject({ name: 'Nuevo Nombre' });
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new name is used by another channel', async () => {
      mockRepository.findByName.mockResolvedValue({ id: 'other-channel' });

      await expect(service.update('channel-1', { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('channel-1', { name: 'Taken' })).rejects.toThrow(
        `El canal comercial con el nombre "Taken" ya existe`,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating to own name (same id in findByName result)', async () => {
      // findByName returns the same channel being updated → id matches → no conflict
      mockRepository.findByName.mockResolvedValue({ id: 'channel-1' });

      await service.update('channel-1', { name: 'Tienda Virtual' });

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should not check name uniqueness when name is not in dto', async () => {
      await service.update('channel-1', {});

      expect(mockRepository.findByName).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should delete channel and return success message', async () => {
      mockRepository.findById.mockResolvedValue(mockChannel);
      mockRepository.delete.mockResolvedValue({});

      const result = await service.remove('channel-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('channel-1');
      expect(result).toEqual({ message: 'Canal comercial eliminado correctamente' });
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
