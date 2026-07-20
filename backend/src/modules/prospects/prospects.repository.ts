import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ContactMedium,
  Prisma,
  ProspectStatus,
} from '../../generated/prisma';
import { startOfDay, endOfDay } from '../../common/utils/date-range.util';
import { FilterProspectsDto } from './dto';

@Injectable()
export class ProspectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectFields = {
    id: true,
    name: true,
    phone: true,
    email: true,
    observation: true,
    status: true,
    advisorId: true,
    clientId: true,
    quoteId: true,
    orderId: true,
    lastContactAt: true,
    contactCount: true,
    createdAt: true,
    updatedAt: true,
    advisor: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    },
    client: {
      select: { id: true, name: true },
    },
    quote: {
      select: { id: true, quoteNumber: true, status: true, orderId: true },
    },
    order: {
      select: { id: true, orderNumber: true, status: true, total: true },
    },
  };

  private readonly contactSelectFields = {
    id: true,
    prospectId: true,
    contactDate: true,
    medium: true,
    outcome: true,
    note: true,
    createdAt: true,
    createdBy: {
      select: { id: true, firstName: true, lastName: true, profilePhoto: true },
    },
  };

  /**
   * Traduce los filtros a un `where` de Prisma.
   *
   * `forcedAdvisorId` viene del servicio cuando el usuario no tiene
   * `read_all_prospects`: se aplica al final para que no pueda ser sobreescrito
   * por el `advisorId` que envíe el cliente.
   */
  private buildWhere(
    filters: FilterProspectsDto,
    forcedAdvisorId?: string,
  ): Prisma.ProspectWhereInput {
    const where: Prisma.ProspectWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.advisorId) where.advisorId = filters.advisorId;

    const from = startOfDay(filters.dateFrom);
    const to = endOfDay(filters.dateTo);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (filters.medium) {
      where.contacts = { some: { medium: filters.medium } };
    }

    if (filters.sinContactoDias) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.sinContactoDias);
      // Incluye los que nunca han sido contactados: son justamente los que
      // más urgen en un pipeline.
      where.OR = [{ lastContactAt: { lte: cutoff } }, { lastContactAt: null }];
    }

    if (filters.search) {
      const search = filters.search.trim();
      const searchOr: Prisma.ProspectWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { observation: { contains: search, mode: 'insensitive' } },
      ];
      // `where.OR` puede estar ocupado por `sinContactoDias`; combinarlos con
      // AND evita que uno pise al otro.
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    if (forcedAdvisorId) where.advisorId = forcedAdvisorId;

    return where;
  }

  async findAll(filters: FilterProspectsDto, forcedAdvisorId?: string) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = this.buildWhere(filters, forcedAdvisorId);

    const [data, total] = await Promise.all([
      this.prisma.prospect.findMany({
        where,
        select: this.selectFields,
        // Los que llevan más tiempo sin contacto primero; los nunca contactados
        // encabezan la lista gracias a `nulls: 'first'`.
        orderBy: [{ lastContactAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prospect.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.prospect.findUnique({
      where: { id },
      select: {
        ...this.selectFields,
        contacts: {
          select: this.contactSelectFields,
          orderBy: { contactDate: 'desc' as const },
        },
      },
    });
  }

  async create(data: Prisma.ProspectCreateInput) {
    return this.prisma.prospect.create({
      data,
      select: this.selectFields,
    });
  }

  async update(id: string, data: Prisma.ProspectUpdateInput) {
    return this.prisma.prospect.update({
      where: { id },
      data,
      select: this.selectFields,
    });
  }

  async delete(id: string) {
    return this.prisma.prospect.delete({ where: { id } });
  }

  /**
   * Crea el contacto y recalcula los denormalizados del prospecto en la misma
   * transacción, para que `contactCount` y `lastContactAt` nunca queden
   * desfasados respecto a la tabla de contactos.
   */
  async addContact(
    prospectId: string,
    data: Omit<Prisma.ProspectContactUncheckedCreateInput, 'prospectId'>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.prospectContact.create({
        data: { ...data, prospectId },
        select: this.contactSelectFields,
      });
      await this.refreshContactAggregates(tx, prospectId);
      return contact;
    });
  }

  async deleteContact(prospectId: string, contactId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.prospectContact.delete({ where: { id: contactId } });
      await this.refreshContactAggregates(tx, prospectId);
    });
  }

  async findContactById(contactId: string) {
    return this.prisma.prospectContact.findUnique({ where: { id: contactId } });
  }

  private async refreshContactAggregates(
    tx: Prisma.TransactionClient,
    prospectId: string,
  ) {
    // Secuencial: una transacción interactiva corre sobre una única conexión,
    // así que paralelizar estas dos queries no ahorra tiempo real.
    const count = await tx.prospectContact.count({ where: { prospectId } });
    const latest = await tx.prospectContact.findFirst({
      where: { prospectId },
      orderBy: { contactDate: 'desc' },
      select: { contactDate: true },
    });

    await tx.prospect.update({
      where: { id: prospectId },
      data: {
        contactCount: count,
        lastContactAt: latest?.contactDate ?? null,
      },
    });
  }

  /** Permisos del usuario, para decidir el scoping en el servicio. */
  async findUserWithPermissions(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: {
          select: {
            permissions: { select: { permission: { select: { name: true } } } },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // Métricas
  // ---------------------------------------------------------------------

  async countProspects(where: Prisma.ProspectWhereInput) {
    return this.prisma.prospect.count({ where });
  }

  async groupContactsByMedium(where: Prisma.ProspectContactWhereInput) {
    return this.prisma.prospectContact.groupBy({
      by: ['medium'],
      where,
      _count: { _all: true },
    });
  }

  async countContacts(where: Prisma.ProspectContactWhereInput) {
    return this.prisma.prospectContact.count({ where });
  }

  /** Prospectos (no contactos) que cumplen la condición sobre sus contactos. */
  async countProspectsWithContactWhere(
    prospectWhere: Prisma.ProspectWhereInput,
    contactWhere: Prisma.ProspectContactWhereInput,
  ) {
    return this.prisma.prospect.count({
      where: { ...prospectWhere, contacts: { some: contactWhere } },
    });
  }

  async findProspectsForMetrics(where: Prisma.ProspectWhereInput) {
    return this.prisma.prospect.findMany({
      where,
      select: {
        id: true,
        advisorId: true,
        status: true,
        quoteId: true,
        orderId: true,
        quote: { select: { orderId: true, order: { select: { total: true } } } },
        order: { select: { total: true } },
      },
    });
  }

  async findAdvisorsByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  async findContactsForMetrics(where: Prisma.ProspectContactWhereInput) {
    return this.prisma.prospectContact.findMany({
      where,
      select: {
        prospectId: true,
        medium: true,
        outcome: true,
        prospect: { select: { advisorId: true } },
      },
    });
  }

  /** Medios disponibles, para que el gráfico muestre todos aunque estén en cero. */
  static readonly ALL_MEDIUMS: ContactMedium[] = [
    ContactMedium.WHATSAPP,
    ContactMedium.LLAMADA,
    ContactMedium.CORREO,
    ContactMedium.PRESENCIAL,
    ContactMedium.REDES,
    ContactMedium.OTRO,
  ];

  static readonly OPEN_STATUSES: ProspectStatus[] = [
    ProspectStatus.NUEVO,
    ProspectStatus.EN_SEGUIMIENTO,
    ProspectStatus.COTIZADO,
  ];
}
