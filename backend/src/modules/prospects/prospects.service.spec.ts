import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProspectsService } from './prospects.service';
import { ProspectsRepository } from './prospects.repository';
import { ContactMedium, ContactOutcome, ProspectStatus } from '../../generated/prisma';

const ADVISOR_ID = 'advisor-1';
const OTHER_ADVISOR_ID = 'advisor-2';

/** Usuario con o sin `read_all_prospects`, en la forma que devuelve el repo. */
const userWithPermissions = (...names: string[]) => ({
  id: ADVISOR_ID,
  role: { permissions: names.map((name) => ({ permission: { name } })) },
});

const baseProspect = {
  id: 'p-1',
  name: 'Maxima Perfumeria',
  phone: '3112431938',
  email: null,
  observation: null,
  status: ProspectStatus.NUEVO,
  advisorId: ADVISOR_ID,
  clientId: null,
  quoteId: null,
  orderId: null,
  lastContactAt: null,
  contactCount: 0,
};

describe('ProspectsService', () => {
  let service: ProspectsService;
  let repository: jest.Mocked<ProspectsRepository>;

  beforeEach(async () => {
    const repositoryMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addContact: jest.fn(),
      deleteContact: jest.fn(),
      findContactById: jest.fn(),
      findUserWithPermissions: jest.fn(),
      findProspectsForMetrics: jest.fn(),
      findContactsForMetrics: jest.fn(),
      findAdvisorsByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectsService,
        { provide: ProspectsRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<ProspectsService>(ProspectsService);
    repository = module.get(ProspectsRepository);

    // Por defecto, usuario restringido a sus propios prospectos.
    repository.findUserWithPermissions.mockResolvedValue(
      userWithPermissions() as never,
    );
  });

  describe('create — datos mínimos', () => {
    it('acepta un prospecto solo con celular', async () => {
      repository.create.mockResolvedValue(baseProspect as never);

      await service.create({ phone: '3112431938' }, ADVISOR_ID);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '3112431938', name: null, email: null }),
      );
    });

    it('acepta un prospecto solo con nombre', async () => {
      repository.create.mockResolvedValue(baseProspect as never);
      await expect(service.create({ name: 'Jorge' }, ADVISOR_ID)).resolves.toBeDefined();
    });

    it('acepta un prospecto solo con correo', async () => {
      repository.create.mockResolvedValue(baseProspect as never);
      await expect(
        service.create({ email: 'a@b.com' }, ADVISOR_ID),
      ).resolves.toBeDefined();
    });

    it('rechaza un prospecto sin ningún dato de contacto', async () => {
      await expect(service.create({}, ADVISOR_ID)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rechaza datos que solo son espacios en blanco', async () => {
      await expect(
        service.create({ name: '   ', phone: '' }, ADVISOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('asigna al usuario autenticado como vendedora si no se especifica', async () => {
      repository.create.mockResolvedValue(baseProspect as never);

      await service.create({ phone: '300' }, ADVISOR_ID);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ advisor: { connect: { id: ADVISOR_ID } } }),
      );
    });
  });

  describe('scoping por vendedora', () => {
    it('fuerza el filtro por advisorId cuando no tiene read_all_prospects', async () => {
      repository.findAll.mockResolvedValue({ data: [], meta: {} } as never);

      await service.findAll({}, ADVISOR_ID);

      expect(repository.findAll).toHaveBeenCalledWith({}, ADVISOR_ID);
    });

    it('ignora el advisorId enviado por el cliente y usa el propio', async () => {
      repository.findAll.mockResolvedValue({ data: [], meta: {} } as never);

      await service.findAll({ advisorId: OTHER_ADVISOR_ID }, ADVISOR_ID);

      // El segundo argumento (forzado) gana sobre el filtro del DTO.
      expect(repository.findAll).toHaveBeenCalledWith(
        { advisorId: OTHER_ADVISOR_ID },
        ADVISOR_ID,
      );
    });

    it('no fuerza filtro cuando tiene read_all_prospects', async () => {
      repository.findUserWithPermissions.mockResolvedValue(
        userWithPermissions('read_all_prospects') as never,
      );
      repository.findAll.mockResolvedValue({ data: [], meta: {} } as never);

      await service.findAll({}, ADVISOR_ID);

      expect(repository.findAll).toHaveBeenCalledWith({}, undefined);
    });

    it('prohíbe ver el prospecto de otra vendedora', async () => {
      repository.findById.mockResolvedValue({
        ...baseProspect,
        advisorId: OTHER_ADVISOR_ID,
      } as never);

      await expect(service.findOne('p-1', ADVISOR_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('permite ver el prospecto ajeno con read_all_prospects', async () => {
      repository.findUserWithPermissions.mockResolvedValue(
        userWithPermissions('read_all_prospects') as never,
      );
      repository.findById.mockResolvedValue({
        ...baseProspect,
        advisorId: OTHER_ADVISOR_ID,
      } as never);

      await expect(service.findOne('p-1', ADVISOR_ID)).resolves.toBeDefined();
    });

    it('lanza NotFound si el prospecto no existe', async () => {
      repository.findById.mockResolvedValue(null as never);
      await expect(service.findOne('nope', ADVISOR_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(baseProspect as never);
      repository.update.mockResolvedValue(baseProspect as never);
    });

    it('permite editar solo la observación sin exigir datos de contacto', async () => {
      await service.update('p-1', { observation: 'No contestó' }, ADVISOR_ID);

      expect(repository.update).toHaveBeenCalledWith('p-1', {
        observation: 'No contestó',
      });
    });

    it('rechaza vaciar el último dato de contacto que queda', async () => {
      repository.findById.mockResolvedValue({
        ...baseProspect,
        name: null,
        email: null,
        phone: '300',
      } as never);

      await expect(
        service.update('p-1', { phone: '' }, ADVISOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una transición de estado inválida', async () => {
      repository.findById.mockResolvedValue({
        ...baseProspect,
        status: ProspectStatus.CONVERTIDO,
      } as never);

      await expect(
        service.update('p-1', { status: ProspectStatus.NUEVO }, ADVISOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('marca COTIZADO al enlazar una cotización', async () => {
      await service.update('p-1', { quoteId: 'q-1' }, ADVISOR_ID);

      expect(repository.update).toHaveBeenCalledWith('p-1', {
        quote: { connect: { id: 'q-1' } },
        status: ProspectStatus.COTIZADO,
      });
    });

    it('marca CONVERTIDO al enlazar una orden', async () => {
      await service.update('p-1', { orderId: 'o-1' }, ADVISOR_ID);

      expect(repository.update).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ status: ProspectStatus.CONVERTIDO }),
      );
    });
  });

  describe('contactos', () => {
    it('saca al prospecto de NUEVO al registrar el primer contacto', async () => {
      repository.findById.mockResolvedValue(baseProspect as never);
      repository.addContact.mockResolvedValue({ id: 'c-1' } as never);
      repository.update.mockResolvedValue(baseProspect as never);

      await service.addContact(
        'p-1',
        { contactDate: '2026-07-18T00:00:00.000Z', medium: ContactMedium.WHATSAPP },
        ADVISOR_ID,
      );

      expect(repository.update).toHaveBeenCalledWith('p-1', {
        status: ProspectStatus.EN_SEGUIMIENTO,
      });
    });

    it('no cambia el estado si ya venía en seguimiento', async () => {
      repository.findById.mockResolvedValue({
        ...baseProspect,
        status: ProspectStatus.EN_SEGUIMIENTO,
      } as never);
      repository.addContact.mockResolvedValue({ id: 'c-1' } as never);

      await service.addContact(
        'p-1',
        { contactDate: '2026-07-18T00:00:00.000Z', medium: ContactMedium.LLAMADA },
        ADVISOR_ID,
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rechaza eliminar un contacto que pertenece a otro prospecto', async () => {
      repository.findById.mockResolvedValue(baseProspect as never);
      repository.findContactById.mockResolvedValue({
        id: 'c-9',
        prospectId: 'otro',
      } as never);

      await expect(
        service.removeContact('p-1', 'c-9', ADVISOR_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repository.deleteContact).not.toHaveBeenCalled();
    });
  });

  describe('convert', () => {
    it('vincula el cliente y marca COTIZADO', async () => {
      repository.findById.mockResolvedValue(baseProspect as never);
      repository.update.mockResolvedValue(baseProspect as never);

      const result = await service.convert(
        'p-1',
        { clientId: 'cli-1', target: 'QUOTE' as never },
        ADVISOR_ID,
      );

      expect(repository.update).toHaveBeenCalledWith('p-1', {
        client: { connect: { id: 'cli-1' } },
        status: ProspectStatus.COTIZADO,
      });
      expect(result.target).toBe('QUOTE');
    });

    it('rechaza convertir un prospecto ya convertido', async () => {
      repository.findById.mockResolvedValue({
        ...baseProspect,
        status: ProspectStatus.CONVERTIDO,
      } as never);

      await expect(
        service.convert('p-1', { clientId: 'cli-1', target: 'QUOTE' as never }, ADVISOR_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMetrics', () => {
    it('calcula tasas de respuesta y conversión, e ingresos', async () => {
      repository.findUserWithPermissions.mockResolvedValue(
        userWithPermissions('read_all_prospects') as never,
      );
      repository.findProspectsForMetrics.mockResolvedValue([
        // Convertido vía cotización → orden de 500
        {
          id: 'p-1',
          advisorId: ADVISOR_ID,
          status: ProspectStatus.CONVERTIDO,
          quoteId: 'q-1',
          orderId: null,
          quote: { orderId: 'o-1', order: { total: '500' } },
          order: null,
        },
        // Cotizado pero no convertido (sin orden ni estado CONVERTIDO)
        {
          id: 'p-2',
          advisorId: ADVISOR_ID,
          status: ProspectStatus.COTIZADO,
          quoteId: 'q-2',
          orderId: null,
          quote: { orderId: null, order: null },
          order: null,
        },
        // Nunca avanzó
        {
          id: 'p-3',
          advisorId: ADVISOR_ID,
          status: ProspectStatus.NUEVO,
          quoteId: null,
          orderId: null,
          quote: null,
          order: null,
        },
      ] as never);
      repository.findContactsForMetrics.mockResolvedValue([
        {
          prospectId: 'p-1',
          medium: ContactMedium.WHATSAPP,
          outcome: ContactOutcome.SOLICITO_COTIZACION,
          prospect: { advisorId: ADVISOR_ID },
        },
        {
          prospectId: 'p-2',
          medium: ContactMedium.LLAMADA,
          outcome: ContactOutcome.CONTESTO,
          prospect: { advisorId: ADVISOR_ID },
        },
        {
          prospectId: 'p-3',
          medium: ContactMedium.WHATSAPP,
          outcome: ContactOutcome.NO_CONTESTO,
          prospect: { advisorId: ADVISOR_ID },
        },
      ] as never);
      repository.findAdvisorsByIds.mockResolvedValue([
        { id: ADVISOR_ID, firstName: 'Ana', lastName: 'Ruiz', email: null },
      ] as never);

      const metrics = await service.getMetrics({}, ADVISOR_ID);

      expect(metrics.totalProspects).toBe(3);
      expect(metrics.totalContacts).toBe(3);
      // 2 de 3 contactados respondieron
      expect(metrics.responseRate).toBe(66.7);
      expect(metrics.quotesRequested).toBe(1);
      expect(metrics.quotesGenerated).toBe(2);
      expect(metrics.converted).toBe(1);
      expect(metrics.conversionRate).toBe(33.3);
      expect(metrics.totalRevenue).toBe(500);

      const whatsapp = metrics.contactsByMedium.find(
        (m) => m.medium === ContactMedium.WHATSAPP,
      );
      expect(whatsapp?.count).toBe(2);
      // Todos los medios aparecen, aunque estén en cero
      expect(metrics.contactsByMedium).toHaveLength(6);

      expect(metrics.advisorBreakdown).toHaveLength(1);
      expect(metrics.advisorBreakdown[0].advisorName).toBe('Ana Ruiz');
    });

    it('cuenta como convertido el prospecto marcado a mano, sin sumar ingresos', async () => {
      repository.findProspectsForMetrics.mockResolvedValue([
        {
          id: 'p-1',
          advisorId: ADVISOR_ID,
          status: ProspectStatus.CONVERTIDO,
          quoteId: null,
          orderId: null,
          quote: null,
          order: null,
        },
      ] as never);
      repository.findContactsForMetrics.mockResolvedValue([] as never);
      repository.findAdvisorsByIds.mockResolvedValue([
        { id: ADVISOR_ID, firstName: 'Ana', lastName: null, email: null },
      ] as never);

      const metrics = await service.getMetrics({}, ADVISOR_ID);

      expect(metrics.converted).toBe(1);
      expect(metrics.conversionRate).toBe(100);
      // No hay orden de dónde sacar el monto.
      expect(metrics.totalRevenue).toBe(0);
    });

    it('devuelve tasas en cero sin datos, sin dividir por cero', async () => {
      repository.findProspectsForMetrics.mockResolvedValue([] as never);
      repository.findContactsForMetrics.mockResolvedValue([] as never);
      repository.findAdvisorsByIds.mockResolvedValue([] as never);

      const metrics = await service.getMetrics({}, ADVISOR_ID);

      expect(metrics.responseRate).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.advisorBreakdown).toEqual([]);
    });

    it('restringe las métricas a la vendedora sin read_all_prospects', async () => {
      repository.findProspectsForMetrics.mockResolvedValue([] as never);
      repository.findContactsForMetrics.mockResolvedValue([] as never);
      repository.findAdvisorsByIds.mockResolvedValue([] as never);

      // Aunque pida las de otra vendedora, se sobreescribe con la propia.
      await service.getMetrics({ advisorId: OTHER_ADVISOR_ID }, ADVISOR_ID);

      expect(repository.findProspectsForMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ advisorId: ADVISOR_ID }),
      );
    });
  });
});
