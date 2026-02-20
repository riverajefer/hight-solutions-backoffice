import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersRepository } from './suppliers.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockSupplier = {
  id: 'supplier-1',
  name: 'Proveedor XYZ',
  email: 'xyz@proveedor.com',
  phone: '3001234567',
  landlinePhone: null,
  address: 'Calle 1 # 2-3',
  encargado: 'Juan Pérez',
  departmentId: 'dept-1',
  cityId: 'city-1',
  personType: 'EMPRESA',
  nit: '900123456',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  department: { id: 'dept-1', name: 'Cundinamarca', code: '25' },
  city: { id: 'city-1', name: 'Bogotá' },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SuppliersRepository', () => {
  let repository: SuppliersRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<SuppliersRepository>(SuppliersRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should filter only active suppliers by default', async () => {
      prisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      await repository.findAll();

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      await repository.findAll(true);

      const callArg = prisma.supplier.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order results by name asc', async () => {
      prisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      await repository.findAll();

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should include department and city in select', async () => {
      prisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      await repository.findAll();

      const callArg = prisma.supplier.findMany.mock.calls[0][0];
      expect(callArg.select.department).toBeDefined();
      expect(callArg.select.city).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should call supplier.findUnique with the given id', async () => {
      prisma.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await repository.findById('supplier-1');

      expect(prisma.supplier.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'supplier-1' } }),
      );
      expect(result).toEqual(mockSupplier);
    });

    it('should return null when supplier does not exist', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByEmail
  // -------------------------------------------------------------------------
  describe('findByEmail', () => {
    it('should call supplier.findUnique with the given email', async () => {
      prisma.supplier.findUnique.mockResolvedValue(mockSupplier);

      await repository.findByEmail('xyz@proveedor.com');

      expect(prisma.supplier.findUnique).toHaveBeenCalledWith({
        where: { email: 'xyz@proveedor.com' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByEmailExcludingId
  // -------------------------------------------------------------------------
  describe('findByEmailExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await repository.findByEmailExcludingId('xyz@proveedor.com', 'supplier-2');

      expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
        where: { email: 'xyz@proveedor.com', NOT: { id: 'supplier-2' } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call supplier.create with the provided data', async () => {
      prisma.supplier.create.mockResolvedValue(mockSupplier);

      await repository.create({ name: 'Nuevo Proveedor' } as any);

      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nuevo Proveedor' } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should call supplier.update with the given id and data', async () => {
      prisma.supplier.update.mockResolvedValue(mockSupplier);

      await repository.update('supplier-1', { name: 'Nombre Actualizado' } as any);

      expect(prisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'supplier-1' },
          data: { name: 'Nombre Actualizado' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call supplier.delete with the given id', async () => {
      prisma.supplier.delete.mockResolvedValue(mockSupplier);

      await repository.delete('supplier-1');

      expect(prisma.supplier.delete).toHaveBeenCalledWith({ where: { id: 'supplier-1' } });
    });
  });
});
