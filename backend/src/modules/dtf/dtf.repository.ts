import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DtfStatus, Prisma } from '../../generated/prisma';

const selectFields = {
  id: true,
  consecutive: true,
  quantity: true,
  unitPrice: true,
  value: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, name: true, basePrice: true, priceUnit: true } },
  client: {
    select: {
      id: true,
      name: true,
      phone: true,
      landlinePhone: true,
      email: true,
      address: true,
      nit: true,
      personType: true,
      city: { select: { name: true } },
    },
  },
  order: { select: { id: true, orderNumber: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

export interface DtfFilters {
  status?: DtfStatus;
  productId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DtfRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithFilters(filters: DtfFilters) {
    const { status, productId, clientId, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DtfRecordWhereInput = {
      ...(status && { status }),
      ...(productId && { productId }),
      ...(clientId && { clientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.dtfRecord.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dtfRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.dtfRecord.findUnique({
      where: { id },
      select: selectFields,
    });
  }

  async create(data: {
    consecutive: string;
    productId: string;
    clientId: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    value: Prisma.Decimal;
    createdById: string;
    notes?: string;
  }) {
    return this.prisma.dtfRecord.create({
      data,
      select: selectFields,
    });
  }

  async update(id: string, data: {
    clientId?: string;
    quantity?: Prisma.Decimal;
    unitPrice?: Prisma.Decimal;
    value?: Prisma.Decimal;
    notes?: string;
  }) {
    return this.prisma.dtfRecord.update({
      where: { id },
      data,
      select: selectFields,
    });
  }

  async updateStatus(id: string, status: DtfStatus, orderId?: string) {
    return this.prisma.dtfRecord.update({
      where: { id },
      data: { status, ...(orderId && { orderId }) },
      select: selectFields,
    });
  }

  async findByIdRaw(id: string) {
    return this.prisma.dtfRecord.findUnique({ where: { id } });
  }

  async createStatusHistory(data: {
    dtfId: string;
    fromStatus: DtfStatus | null;
    toStatus: DtfStatus;
    changedById: string;
    changedAt?: Date;
  }) {
    await this.prisma.dtfStatusHistory.create({ data });
  }

  async getStatusHistory(dtfId: string) {
    return this.prisma.dtfStatusHistory.findMany({
      where: { dtfId },
      orderBy: { changedAt: 'asc' },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        changedAt: true,
        changedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
