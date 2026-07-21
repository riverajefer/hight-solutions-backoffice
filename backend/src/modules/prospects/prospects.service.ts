import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactMedium,
  ContactOutcome,
  Prisma,
  ProspectStatus,
} from '../../generated/prisma';
import { startOfDay, endOfDay } from '../../common/utils/date-range.util';
import { ProspectsRepository } from './prospects.repository';
import { isValidProspectTransition } from './prospect-status-transitions';
import {
  ConvertProspectDto,
  CreateProspectContactDto,
  CreateProspectDto,
  FilterProspectsDto,
  ProspectConversionTarget,
  ProspectMetricsFilterDto,
  UpdateProspectDto,
} from './dto';

const READ_ALL_PROSPECTS = 'read_all_prospects';

@Injectable()
export class ProspectsService {
  constructor(private readonly repository: ProspectsRepository) {}

  /**
   * `undefined` si el usuario puede ver todo; su propio id si debe quedar
   * restringido a sus prospectos. Se resuelve en el servidor —no se confía en
   * que el frontend mande el filtro— para que la vendedora no pueda ver el
   * pipeline de sus compañeras cambiando un query param.
   */
  private async resolveScope(userId: string): Promise<string | undefined> {
    const user = await this.repository.findUserWithPermissions(userId);
    const canReadAll = user?.role?.permissions?.some(
      (rp) => rp.permission.name === READ_ALL_PROSPECTS,
    );
    return canReadAll ? undefined : userId;
  }

  private assertHasContactData(dto: {
    name?: string;
    phone?: string;
    email?: string;
  }) {
    const hasAny = [dto.name, dto.phone, dto.email].some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    if (!hasAny) {
      throw new BadRequestException(
        'Registra al menos un dato de contacto: nombre, celular o correo',
      );
    }
  }

  async create(dto: CreateProspectDto, userId: string) {
    this.assertHasContactData(dto);

    return this.repository.create({
      name: dto.name?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      observation: dto.observation ?? null,
      status: dto.status ?? ProspectStatus.NUEVO,
      advisor: { connect: { id: dto.advisorId ?? userId } },
      createdBy: { connect: { id: userId } },
    });
  }

  async findAll(filters: FilterProspectsDto, userId: string) {
    const forcedAdvisorId = await this.resolveScope(userId);
    return this.repository.findAll(filters, forcedAdvisorId);
  }

  async findOne(id: string, userId: string) {
    const prospect = await this.repository.findById(id);
    if (!prospect) {
      throw new NotFoundException(`Prospecto con ID ${id} no encontrado`);
    }

    const forcedAdvisorId = await this.resolveScope(userId);
    if (forcedAdvisorId && prospect.advisorId !== forcedAdvisorId) {
      throw new ForbiddenException('Este prospecto pertenece a otra vendedora');
    }

    return prospect;
  }

  async update(id: string, dto: UpdateProspectDto, userId: string) {
    const current = await this.findOne(id, userId);

    if (dto.status && dto.status !== current.status) {
      if (!isValidProspectTransition(current.status, dto.status)) {
        throw new BadRequestException(
          `No se puede pasar de "${current.status}" a "${dto.status}"`,
        );
      }
    }

    // Solo validar "al menos un dato" si el update toca esos campos; de lo
    // contrario editar únicamente la observación fallaría.
    const touchesContactData =
      dto.name !== undefined || dto.phone !== undefined || dto.email !== undefined;
    if (touchesContactData) {
      this.assertHasContactData({
        name: dto.name ?? current.name ?? undefined,
        phone: dto.phone ?? current.phone ?? undefined,
        email: dto.email ?? current.email ?? undefined,
      });
    }

    const data: Prisma.ProspectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.observation !== undefined) data.observation = dto.observation;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.advisorId !== undefined) {
      data.advisor = { connect: { id: dto.advisorId } };
    }
    if (dto.clientId !== undefined) {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.orderId !== undefined) {
      data.order = { connect: { id: dto.orderId } };
      data.status = ProspectStatus.CONVERTIDO;
    }
    if (dto.quoteId !== undefined) {
      data.quote = { connect: { id: dto.quoteId } };
      // Enlazar la cotización implica que sí se cotizó, salvo que ya haya
      // avanzado a CONVERTIDO.
      if (
        current.status !== ProspectStatus.CONVERTIDO &&
        dto.orderId === undefined
      ) {
        data.status = ProspectStatus.COTIZADO;
      }
    }

    return this.repository.update(id, data);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.repository.delete(id);
    return { message: 'Prospecto eliminado' };
  }

  async addContact(
    prospectId: string,
    dto: CreateProspectContactDto,
    userId: string,
  ) {
    const prospect = await this.findOne(prospectId, userId);

    const contact = await this.repository.addContact(prospectId, {
      contactDate: new Date(dto.contactDate),
      medium: dto.medium,
      outcome: dto.outcome ?? null,
      note: dto.note ?? null,
      createdById: userId,
    });

    // El primer contacto saca al prospecto de NUEVO automáticamente: si ya se
    // le habló, está en seguimiento.
    if (prospect.status === ProspectStatus.NUEVO) {
      await this.repository.update(prospectId, {
        status: ProspectStatus.EN_SEGUIMIENTO,
      });
    }

    return contact;
  }

  async removeContact(prospectId: string, contactId: string, userId: string) {
    await this.findOne(prospectId, userId);

    const contact = await this.repository.findContactById(contactId);
    if (!contact || contact.prospectId !== prospectId) {
      throw new NotFoundException('Contacto no encontrado en este prospecto');
    }

    await this.repository.deleteContact(prospectId, contactId);
    return { message: 'Contacto eliminado' };
  }

  /**
   * Vincula el prospecto a un cliente y lo marca como cotizado. No crea la
   * cotización aquí: el frontend navega al formulario de cotización, que al
   * guardar devuelve el `quoteId` vía `update`.
   */
  async convert(id: string, dto: ConvertProspectDto, userId: string) {
    const prospect = await this.findOne(id, userId);

    // Un prospecto con documento asociado (cotización u orden) ya no se puede
    // volver a convertir: hacerlo crearía una segunda cotización y sobrescribiría
    // el enlace, inflando las métricas. Se rechaza aquí, no solo en la UI.
    if (prospect.quoteId || prospect.orderId) {
      throw new BadRequestException(
        'Este prospecto ya tiene un documento asociado y no se puede volver a convertir',
      );
    }

    if (prospect.status === ProspectStatus.CONVERTIDO) {
      throw new BadRequestException(
        'Este prospecto ya fue convertido en una orden',
      );
    }

    const updated = await this.repository.update(id, {
      client: { connect: { id: dto.clientId } },
      status: ProspectStatus.COTIZADO,
    });

    return { prospect: updated, target: dto.target };
  }

  // ---------------------------------------------------------------------
  // Métricas
  // ---------------------------------------------------------------------

  /**
   * Métricas del pipeline por vendedora. Contesta las preguntas del negocio:
   * a cuántas personas contacté, por qué medio, cuántas respondieron, cuántas
   * pidieron cotización y cuántas terminaron en venta.
   */
  async getMetrics(filters: ProspectMetricsFilterDto, userId: string) {
    const forcedAdvisorId = await this.resolveScope(userId);
    const advisorId = forcedAdvisorId ?? filters.advisorId;

    const from = startOfDay(filters.dateFrom);
    const to = endOfDay(filters.dateTo);

    const prospectWhere: Prisma.ProspectWhereInput = {};
    if (advisorId) prospectWhere.advisorId = advisorId;
    if (from || to) {
      prospectWhere.createdAt = {};
      if (from) prospectWhere.createdAt.gte = from;
      if (to) prospectWhere.createdAt.lte = to;
    }

    // Los contactos se filtran por su propia fecha, no por la de creación del
    // prospecto: un prospecto de marzo contactado en julio cuenta en julio.
    const contactWhere: Prisma.ProspectContactWhereInput = {};
    if (advisorId) contactWhere.prospect = { advisorId };
    if (from || to) {
      contactWhere.contactDate = {};
      if (from) contactWhere.contactDate.gte = from;
      if (to) contactWhere.contactDate.lte = to;
    }

    const [prospects, contacts] = await Promise.all([
      this.repository.findProspectsForMetrics(prospectWhere),
      this.repository.findContactsForMetrics(contactWhere),
    ]);

    const advisorIds = Array.from(
      new Set([
        ...prospects.map((p) => p.advisorId),
        ...contacts.map((c) => c.prospect.advisorId),
      ]),
    );
    const advisors = await this.repository.findAdvisorsByIds(advisorIds);
    const advisorNames = new Map(
      advisors.map((a) => [
        a.id,
        [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.id,
      ]),
    );

    const global = this.buildMetricsBucket(prospects, contacts);

    const advisorBreakdown = advisorIds
      .map((id) => {
        const bucket = this.buildMetricsBucket(
          prospects.filter((p) => p.advisorId === id),
          contacts.filter((c) => c.prospect.advisorId === id),
        );
        return {
          advisorId: id,
          advisorName: advisorNames.get(id) ?? id,
          ...bucket,
        };
      })
      .sort((a, b) => b.converted - a.converted || b.totalContacts - a.totalContacts);

    return { ...global, advisorBreakdown };
  }

  private buildMetricsBucket(
    prospects: Awaited<
      ReturnType<ProspectsRepository['findProspectsForMetrics']>
    >,
    contacts: Awaited<
      ReturnType<ProspectsRepository['findContactsForMetrics']>
    >,
  ) {
    const totalProspects = prospects.length;
    const totalContacts = contacts.length;

    const contactsByMedium = ProspectsRepository.ALL_MEDIUMS.map((medium) => ({
      medium,
      count: contacts.filter((c) => c.medium === medium).length,
    }));

    // "Respondió" = al menos un contacto con resultado distinto de NO_CONTESTO.
    // Un contacto sin resultado registrado no cuenta como respuesta.
    const respondedProspectIds = new Set(
      contacts
        .filter(
          (c) => c.outcome != null && c.outcome !== ContactOutcome.NO_CONTESTO,
        )
        .map((c) => c.prospectId),
    );
    const contactedProspectIds = new Set(contacts.map((c) => c.prospectId));

    const quotesRequested = new Set(
      contacts
        .filter((c) => c.outcome === ContactOutcome.SOLICITO_COTIZACION)
        .map((c) => c.prospectId),
    ).size;

    const quotesGenerated = prospects.filter((p) => p.quoteId != null).length;

    // Convertido = tiene orden directa, su cotización derivada se volvió orden,
    // o la vendedora lo marcó CONVERTIDO en el tablero. Se incluye este último
    // caso para que el kanban y las métricas no se contradigan.
    const convertedProspects = prospects.filter(
      (p) =>
        p.orderId != null ||
        p.quote?.orderId != null ||
        p.status === ProspectStatus.CONVERTIDO,
    );
    const converted = convertedProspects.length;

    // Los ingresos solo cuentan órdenes reales: un prospecto marcado a mano no
    // aporta monto porque no hay de dónde sacarlo.
    const totalRevenue = convertedProspects.reduce((sum, p) => {
      const total = p.order?.total ?? p.quote?.order?.total;
      return sum + (total ? Number(total.toString()) : 0);
    }, 0);

    const rate = (num: number, den: number) =>
      den === 0 ? 0 : Math.round((num / den) * 1000) / 10;

    return {
      totalProspects,
      totalContacts,
      contactsByMedium,
      contactedProspects: contactedProspectIds.size,
      responded: respondedProspectIds.size,
      responseRate: rate(respondedProspectIds.size, contactedProspectIds.size),
      quotesRequested,
      quotesGenerated,
      converted,
      conversionRate: rate(converted, totalProspects),
      totalRevenue,
    };
  }
}
