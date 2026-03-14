import { Test, TestingModule } from '@nestjs/testing';
import { CommercialChannelsRepository } from './commercial-channels.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

const mockChannel = {
  id: 'ch-1',
  name: 'Venta Directa',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CommercialChannelsRepository', () => {
  let repository: CommercialChannelsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialChannelsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<CommercialChannelsRepository>(CommercialChannelsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should order by createdAt desc', async () => {
      prisma.commercialChannel.findMany.mockResolvedValue([mockChannel]);
      const result = await repository.findAll();
      expect(prisma.commercialChannel.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockChannel]);
    });
  });

  describe('findById', () => {
    it('should call commercialChannel.findUnique with the given id', async () => {
      prisma.commercialChannel.findUnique.mockResolvedValue(mockChannel);
      const result = await repository.findById('ch-1');
      expect(prisma.commercialChannel.findUnique).toHaveBeenCalledWith({ where: { id: 'ch-1' } });
      expect(result).toEqual(mockChannel);
    });

    it('should return null when channel does not exist', async () => {
      prisma.commercialChannel.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should call commercialChannel.findUnique with the given name', async () => {
      prisma.commercialChannel.findUnique.mockResolvedValue(mockChannel);
      await repository.findByName('Venta Directa');
      expect(prisma.commercialChannel.findUnique).toHaveBeenCalledWith({
        where: { name: 'Venta Directa' },
      });
    });
  });

  describe('create', () => {
    it('should call commercialChannel.create with the provided data', async () => {
      prisma.commercialChannel.create.mockResolvedValue(mockChannel);
      await repository.create({ name: 'Nuevo Canal' } as any);
      expect(prisma.commercialChannel.create).toHaveBeenCalledWith({
        data: { name: 'Nuevo Canal' },
      });
    });
  });

  describe('update', () => {
    it('should call commercialChannel.update with the given id and data', async () => {
      prisma.commercialChannel.update.mockResolvedValue(mockChannel);
      await repository.update('ch-1', { name: 'Canal Actualizado' } as any);
      expect(prisma.commercialChannel.update).toHaveBeenCalledWith({
        where: { id: 'ch-1' },
        data: { name: 'Canal Actualizado' },
      });
    });
  });

  describe('delete', () => {
    it('should call commercialChannel.delete with the given id', async () => {
      prisma.commercialChannel.delete.mockResolvedValue(mockChannel);
      await repository.delete('ch-1');
      expect(prisma.commercialChannel.delete).toHaveBeenCalledWith({ where: { id: 'ch-1' } });
    });
  });
});
