import { Test, TestingModule } from '@nestjs/testing';
import { ClientsRepository } from './clients.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockClient = {
  id: 'client-1',
  name: 'Cliente ABC',
  email: 'abc@cliente.com',
  phone: '3001234567',
  isActive: true,
  department: { id: 'dept-1', name: 'Cundinamarca', code: '25' },
  city: { id: 'city-1', name: 'Bogotá' },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('ClientsRepository', () => {
  let repository: ClientsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<ClientsRepository>(ClientsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should filter only active clients by default', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);

      await repository.findAll();

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should return all clients including inactive when includeInactive=true', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);

      await repository.findAll(true);

      const callArg = prisma.client.findMany.mock.calls[0][0];
      // where should be {} (not filtering by isActive)
      expect(callArg.where).toEqual({});
    });

    it('should order results by name asc', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);

      await repository.findAll();

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should include department and city in select', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);

      await repository.findAll();

      const callArg = prisma.client.findMany.mock.calls[0][0];
      expect(callArg.select.department).toBeDefined();
      expect(callArg.select.city).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should call client.findUnique with the given id', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);

      const result = await repository.findById('client-1');

      expect(prisma.client.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'client-1' } }),
      );
      expect(result).toEqual(mockClient);
    });

    it('should return null when client does not exist', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmail
  // ---------------------------------------------------------------------------
  describe('findByEmail', () => {
    it('should call client.findUnique with the email', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);

      await repository.findByEmail('abc@cliente.com');

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { email: 'abc@cliente.com' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmailExcludingId
  // ---------------------------------------------------------------------------
  describe('findByEmailExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await repository.findByEmailExcludingId('abc@cliente.com', 'client-2');

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { email: 'abc@cliente.com', NOT: { id: 'client-2' } },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findAllEmails
  // ---------------------------------------------------------------------------
  describe('findAllEmails', () => {
    it('should return a flat array of email strings', async () => {
      prisma.client.findMany.mockResolvedValue([
        { email: 'a@test.com' },
        { email: 'b@test.com' },
      ] as any);

      const result = await repository.findAllEmails();

      expect(result).toEqual(['a@test.com', 'b@test.com']);
      expect(prisma.client.findMany).toHaveBeenCalledWith({ select: { email: true } });
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call client.create with the provided data', async () => {
      prisma.client.create.mockResolvedValue(mockClient);

      await repository.create({ name: 'Cliente ABC', email: 'abc@cliente.com' } as any);

      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Cliente ABC', email: 'abc@cliente.com' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should call client.update with the given id and data', async () => {
      prisma.client.update.mockResolvedValue(mockClient);

      await repository.update('client-1', { name: 'Nuevo Nombre' } as any);

      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-1' },
          data: { name: 'Nuevo Nombre' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateSpecialCondition
  // ---------------------------------------------------------------------------
  describe('updateSpecialCondition', () => {
    it('should update only the specialCondition field', async () => {
      prisma.client.update.mockResolvedValue({ id: 'client-1', specialCondition: 'VIP' } as any);

      await repository.updateSpecialCondition('client-1', 'VIP');

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { specialCondition: 'VIP' },
        select: expect.objectContaining({ specialCondition: true }),
      });
    });

    it('should accept null to clear the special condition', async () => {
      prisma.client.update.mockResolvedValue({ id: 'client-1', specialCondition: null } as any);

      await repository.updateSpecialCondition('client-1', null);

      const callArg = prisma.client.update.mock.calls[0][0];
      expect(callArg.data.specialCondition).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // createMany (uses $transaction)
  // ---------------------------------------------------------------------------
  describe('createMany', () => {
    it('should execute all creates inside a $transaction', async () => {
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
      prisma.client.create.mockResolvedValue(mockClient);

      const clients = [
        { name: 'A', email: 'a@test.com', phone: '3000000000', personType: 'NATURAL' as any,
          departmentId: 'd1', cityId: 'c1', nit: null, cedula: null, manager: null,
          encargado: null, landlinePhone: null, address: null },
        { name: 'B', email: 'b@test.com', phone: '3000000001', personType: 'EMPRESA' as any,
          departmentId: 'd1', cityId: 'c1', nit: '900111', cedula: null, manager: null,
          encargado: null, landlinePhone: null, address: null },
      ];

      await repository.createMany(clients);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.client.create).toHaveBeenCalledTimes(2);
    });
  });
});
