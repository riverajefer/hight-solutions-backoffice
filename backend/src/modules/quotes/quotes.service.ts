import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuotesRepository } from './quotes.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  FilterQuotesDto,
  AddQuoteItemDto,
  UpdateQuoteItemDto,
} from './dto';
import { QuoteStatus, OrderStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class QuotesService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(filters: FilterQuotesDto) {
    return this.quotesRepository.findAll({
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    });
  }

  async findOne(id: string) {
    const quote = await this.quotesRepository.findById(id);
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  async create(createQuoteDto: CreateQuoteDto, createdById: string) {
    if (!createQuoteDto.items || createQuoteDto.items.length === 0) {
      throw new BadRequestException('Quote must have at least one item');
    }

    const quoteNumber = await this.consecutivesService.generateNumber('QUOTE');

    let subtotal = new Prisma.Decimal(0);
    const items = createQuoteDto.items.map((item, index) => {
      const itemTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
      subtotal = subtotal.add(itemTotal);

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
        specifications: item.specifications || undefined,
        sortOrder: index + 1,
        ...(item.serviceId && {
          service: { connect: { id: item.serviceId } },
        }),
      };
    });

    const taxRate = new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);
    const total = subtotal.add(tax);

    const newQuote = await this.quotesRepository.create({
      quoteNumber,
      quoteDate: new Date(),
      validUntil: createQuoteDto.validUntil ? new Date(createQuoteDto.validUntil) : undefined,
      subtotal,
      taxRate,
      tax,
      total,
      notes: createQuoteDto.notes,
      client: { connect: { id: createQuoteDto.clientId } },
      createdBy: { connect: { id: createdById } },
      ...(createQuoteDto.commercialChannelId && {
        commercialChannel: { connect: { id: createQuoteDto.commercialChannelId } },
      }),
      items: {
        create: items,
      },
    });

    return newQuote;
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto, userId: string) {
    const oldQuote = await this.findOne(id);

    if (oldQuote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Cannot update a converted quote');
    }

    if (updateQuoteDto.items) {
      return this.prisma.$transaction(async (tx) => {
        // Handle basic fields
        await tx.quote.update({
          where: { id },
          data: {
            ...(updateQuoteDto.clientId && { client: { connect: { id: updateQuoteDto.clientId } } }),
            ...(updateQuoteDto.validUntil && { validUntil: new Date(updateQuoteDto.validUntil) }),
            ...(updateQuoteDto.notes !== undefined && { notes: updateQuoteDto.notes }),
            ...(updateQuoteDto.status && { status: updateQuoteDto.status }),
            ...(updateQuoteDto.commercialChannelId && {
              commercialChannel: { connect: { id: updateQuoteDto.commercialChannelId } },
            }),
          },
        });

        // Reconcile items
        const currentItems = await tx.quoteItem.findMany({ where: { quoteId: id } });
        const currentIds = new Set(currentItems.map((i) => i.id));
        
        const itemsToUpdate = updateQuoteDto.items!.filter(i => i.id && currentIds.has(i.id));
        const itemsToCreate = updateQuoteDto.items!.filter(i => !i.id || !currentIds.has(i.id));
        const keepIds = new Set(itemsToUpdate.map(i => i.id!));
        
        const idsToDelete = [...currentIds].filter(dbId => !keepIds.has(dbId));
        if (idsToDelete.length > 0) {
          await tx.quoteItem.deleteMany({ where: { id: { in: idsToDelete } } });
        }

        for (const item of itemsToUpdate) {
          const itemTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
          await tx.quoteItem.update({
            where: { id: item.id! },
            data: {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: itemTotal,
              specifications: item.specifications || undefined,
              ...(item.serviceId && { serviceId: item.serviceId }),
            },
          });
        }

        for (let i = 0; i < itemsToCreate.length; i++) {
          const item = itemsToCreate[i];
          const itemTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
          await tx.quoteItem.create({
            data: {
              quoteId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: itemTotal,
              specifications: item.specifications || undefined,
              sortOrder: currentItems.length - idsToDelete.length + i + 1,
              ...(item.serviceId && { serviceId: item.serviceId }),
            },
          });
        }

        return this.recalculateQuoteTotals(id, tx);
      });
    }

    return this.quotesRepository.update(id, {
      ...(updateQuoteDto.clientId && { client: { connect: { id: updateQuoteDto.clientId } } }),
      ...(updateQuoteDto.validUntil && { validUntil: new Date(updateQuoteDto.validUntil) }),
      ...(updateQuoteDto.notes !== undefined && { notes: updateQuoteDto.notes }),
      ...(updateQuoteDto.status && { status: updateQuoteDto.status }),
      ...(updateQuoteDto.commercialChannelId && {
        commercialChannel: { connect: { id: updateQuoteDto.commercialChannelId } },
      }),
    });
  }

  async remove(id: string) {
    const quote = await this.findOne(id);
    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Cannot delete a converted quote');
    }
    await this.quotesRepository.delete(id);
    return { message: 'Quote deleted successfully' };
  }

  async convertToOrder(id: string, userId: string) {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Quote already converted to an order');
    }

    // Start transaction to create order and link to quote
    return this.prisma.$transaction(async (tx) => {
      // 1. Generate order number
      const orderNumber = await this.consecutivesService.generateNumber('ORDER');

      // 2. Create Order based on Quote
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          clientId: quote.clientId,
          orderDate: new Date(),
          subtotal: quote.subtotal,
          taxRate: quote.taxRate,
          tax: quote.tax,
          total: quote.total,
          paidAmount: 0,
          balance: quote.total,
          status: OrderStatus.DRAFT,
          notes: `Convertida desde Cotización ${quote.quoteNumber}. ${quote.notes || ''}`,
          createdById: userId,
          commercialChannelId: quote.commercialChannelId,
          quote: { connect: { id: quote.id } }, // Link the quote
          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              specifications: item.specifications || undefined,
              sortOrder: item.sortOrder,
              serviceId: item.serviceId,
            })),
          },
        },
      });

      // 3. Update Quote status
      await tx.quote.update({
        where: { id: quote.id },
        data: { 
          status: QuoteStatus.CONVERTED,
          orderId: newOrder.id 
        },
      });

      return newOrder;
    });
  }

  private async recalculateQuoteTotals(id: string, tx: Prisma.TransactionClient) {
    const items = await tx.quoteItem.findMany({ where: { quoteId: id } });
    
    let subtotal = new Prisma.Decimal(0);
    for (const item of items) {
      subtotal = subtotal.add(item.total);
    }

    const quote = await tx.quote.findUnique({
      where: { id },
      select: { taxRate: true },
    });

    const taxRate = quote?.taxRate || new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);
    const total = subtotal.add(tax);

    return tx.quote.update({
      where: { id },
      data: { subtotal, tax, total },
      include: {
        items: { include: { service: true } },
        client: true,
      },
    });
  }
}
