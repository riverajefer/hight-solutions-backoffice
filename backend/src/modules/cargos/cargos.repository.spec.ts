import { Test, TestingModule } from '@nestjs/testing';
import { CargosRepository } from './cargos.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

const mockCargo = {
  id: 'cargo-1',
  name: 'Operario',
  description: 'Operario de producción',
  isActive: true,
  areaId: 'area-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  area: { id: 'area-1', name: 'Producción', isActive: true },
  _count: { users: 2 },
};

describe('CargosRepository', () => {
  let repository: CargosRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CargosRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<CargosRepository>(CargosRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should filter only active cargos by default', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findAll();
      expect(prisma.cargo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findAll(true);
      const callArg = prisma.cargo.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order by area name then cargo name', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findAll();
      const callArg = prisma.cargo.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toEqual([{ area: { name: 'asc' } }, { name: 'asc' }]);
    });

    it('should include area and _count in select', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findAll();
      const callArg = prisma.cargo.findMany.mock.calls[0][0];
      expect(callArg.select.area).toBeDefined();
      expect(callArg.select._count).toBeDefined();
    });
  });

  describe('findByArea', () => {
    it('should filter by areaId and active only by default', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findByArea('area-1');
      expect(prisma.cargo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { areaId: 'area-1', isActive: true },
        }),
      );
    });

    it('should include inactive when includeInactive=true', async () => {
      prisma.cargo.findMany.mockResolvedValue([mockCargo]);
      await repository.findByArea('area-1', true);
      const callArg = prisma.cargo.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ areaId: 'area-1' });
    });
  });

  describe('findById', () => {
    it('should call cargo.findUnique with the given id', async () => {
      prisma.cargo.findUnique.mockResolvedValue(mockCargo);
      const result = await repository.findById('cargo-1');
      expect(prisma.cargo.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cargo-1' } }),
      );
      expect(result).toEqual(mockCargo);
    });

    it('should return null when cargo does not exist', async () => {
      prisma.cargo.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findByNameAndArea', () => {
    it('should call findUnique with composite key name_areaId', async () => {
      prisma.cargo.findUnique.mockResolvedValue(mockCargo);
      await repository.findByNameAndArea('Operario', 'area-1');
      expect(prisma.cargo.findUnique).toHaveBeenCalledWith({
        where: { name_areaId: { name: 'Operario', areaId: 'area-1' } },
      });
    });
  });

  describe('findByNameAndAreaExcludingId', () => {
    it('should use findFirst with name, areaId and NOT id clause', async () => {
      prisma.cargo.findFirst.mockResolvedValue(null);
      await repository.findByNameAndAreaExcludingId('Operario', 'area-1', 'cargo-2');
      expect(prisma.cargo.findFirst).toHaveBeenCalledWith({
        where: { name: 'Operario', areaId: 'area-1', NOT: { id: 'cargo-2' } },
      });
    });
  });

  describe('create', () => {
    it('should call cargo.create with the provided data', async () => {
      prisma.cargo.create.mockResolvedValue(mockCargo);
      await repository.create({ name: 'Nuevo Cargo' } as any);
      expect(prisma.cargo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nuevo Cargo' } }),
      );
    });
  });

  describe('update', () => {
    it('should call cargo.update with the given id and data', async () => {
      prisma.cargo.update.mockResolvedValue(mockCargo);
      await repository.update('cargo-1', { name: 'Actualizado' } as any);
      expect(prisma.cargo.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cargo-1' }, data: { name: 'Actualizado' } }),
      );
    });
  });

  describe('countUsers', () => {
    it('should count users with the given cargoId', async () => {
      prisma.user.count.mockResolvedValue(3);
      const result = await repository.countUsers('cargo-1');
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { cargoId: 'cargo-1' } });
      expect(result).toBe(3);
    });
  });

  describe('delete', () => {
    it('should call cargo.delete with the given id', async () => {
      prisma.cargo.delete.mockResolvedValue(mockCargo);
      await repository.delete('cargo-1');
      expect(prisma.cargo.delete).toHaveBeenCalledWith({ where: { id: 'cargo-1' } });
    });
  });
});
