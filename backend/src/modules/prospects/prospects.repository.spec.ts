import { Test, TestingModule } from '@nestjs/testing';
import { ProspectsRepository } from './prospects.repository';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService } from '../../database/prisma.service.mock';

describe('ProspectsRepository', () => {
  let repository: ProspectsRepository;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<ProspectsRepository>(ProspectsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll (buildWhere)', () => {
    it('pagina y arma el where con status y advisor', async () => {
      prisma.prospect.findMany.mockResolvedValue([] as any);
      prisma.prospect.count.mockResolvedValue(0 as any);

      const result = await repository.findAll({
        status: 'NUEVO',
        advisorId: 'adv1',
        page: 2,
        limit: 10,
      } as any);

      const call = prisma.prospect.findMany.mock.calls[0][0];
      expect(call.where).toEqual(expect.objectContaining({ status: 'NUEVO', advisorId: 'adv1' }));
      expect(call.skip).toBe(10);
      expect(result.meta).toEqual({ total: 0, page: 2, limit: 10, totalPages: 0 });
    });

    it('el forcedAdvisorId sobreescribe el advisorId del filtro', async () => {
      prisma.prospect.findMany.mockResolvedValue([] as any);
      prisma.prospect.count.mockResolvedValue(0 as any);

      await repository.findAll({ advisorId: 'adv-cliente' } as any, 'adv-forzado');

      const where = prisma.prospect.findMany.mock.calls[0][0].where;
      expect(where.advisorId).toBe('adv-forzado');
    });

    it('combina búsqueda y sinContactoDias con AND para no pisarse', async () => {
      prisma.prospect.findMany.mockResolvedValue([] as any);
      prisma.prospect.count.mockResolvedValue(0 as any);

      await repository.findAll({ search: 'juan', sinContactoDias: 7 } as any);

      const where = prisma.prospect.findMany.mock.calls[0][0].where;
      expect(where.AND).toHaveLength(2);
      expect(where.OR).toBeUndefined();
    });

    it('filtra por medio de contacto', async () => {
      prisma.prospect.findMany.mockResolvedValue([] as any);
      prisma.prospect.count.mockResolvedValue(0 as any);

      await repository.findAll({ medium: 'WHATSAPP' } as any);

      const where = prisma.prospect.findMany.mock.calls[0][0].where;
      expect(where.contacts).toEqual({ some: { medium: 'WHATSAPP' } });
    });
  });

  describe('findById', () => {
    it('incluye los contactos', async () => {
      prisma.prospect.findUnique.mockResolvedValue({ id: 'p1' } as any);
      await repository.findById('p1');
      const call = prisma.prospect.findUnique.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'p1' });
      expect(call.select.contacts).toBeDefined();
    });
  });

  describe('addContact', () => {
    it('crea el contacto y recalcula agregados en la transacción', async () => {
      prisma.prospectContact.create.mockResolvedValue({ id: 'c1' } as any);
      prisma.prospectContact.count.mockResolvedValue(3 as any);
      prisma.prospectContact.findFirst.mockResolvedValue({ contactDate: new Date('2026-08-01') } as any);
      prisma.prospect.update.mockResolvedValue({} as any);

      const result = await repository.addContact('p1', { medium: 'WHATSAPP' } as any);

      expect(prisma.prospectContact.create).toHaveBeenCalled();
      expect(prisma.prospect.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ contactCount: 3 }),
        }),
      );
      expect(result).toEqual({ id: 'c1' });
    });
  });

  describe('deleteContact', () => {
    it('borra el contacto y recalcula, dejando lastContactAt null sin contactos', async () => {
      prisma.prospectContact.delete.mockResolvedValue({} as any);
      prisma.prospectContact.count.mockResolvedValue(0 as any);
      prisma.prospectContact.findFirst.mockResolvedValue(null as any);
      prisma.prospect.update.mockResolvedValue({} as any);

      await repository.deleteContact('p1', 'c1');

      expect(prisma.prospectContact.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(prisma.prospect.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contactCount: 0, lastContactAt: null }),
        }),
      );
    });
  });

  describe('métricas y helpers', () => {
    it('findUserWithPermissions consulta el usuario con permisos', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as any);
      await repository.findUserWithPermissions('u1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });

    it('countProspects delega en prisma.count', async () => {
      prisma.prospect.count.mockResolvedValue(5 as any);
      await expect(repository.countProspects({})).resolves.toBe(5);
    });

    it('groupContactsByMedium agrupa por medio', async () => {
      prisma.prospectContact.groupBy.mockResolvedValue([] as any);
      await repository.groupContactsByMedium({});
      expect(prisma.prospectContact.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['medium'] }),
      );
    });

    it('findProspectsForMetrics selecciona los campos de métricas', async () => {
      prisma.prospect.findMany.mockResolvedValue([] as any);
      await repository.findProspectsForMetrics({});
      expect(prisma.prospect.findMany).toHaveBeenCalled();
    });

    it('findAdvisorsByIds busca asesores por id', async () => {
      prisma.user.findMany.mockResolvedValue([] as any);
      await repository.findAdvisorsByIds(['a1', 'a2']);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['a1', 'a2'] } } }),
      );
    });
  });
});
