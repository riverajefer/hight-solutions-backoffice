import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuotesRepository } from './quotes.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageService } from '../storage/storage.service';
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
    private readonly storageService: StorageService,
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

      const itemData: any = {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
        specifications: item.specifications || undefined,
        sortOrder: index + 1,
        ...(item.productId && {
          product: { connect: { id: item.productId } },
        }),
        ...(item.sampleImageId && {
          sampleImageId: item.sampleImageId,
        }),
      };

      // Add production areas if provided
      if (item.productionAreaIds && item.productionAreaIds.length > 0) {
        itemData.productionAreas = {
          create: item.productionAreaIds.map((areaId: string) => ({
            productionArea: { connect: { id: areaId } },
          })),
        };
      }

      return itemData;
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

    const isConverting = updateQuoteDto.status === QuoteStatus.CONVERTED;

    if (updateQuoteDto.items) {
      await this.prisma.$transaction(async (tx) => {
        // Handle basic fields
        await tx.quote.update({
          where: { id },
          data: {
            ...(updateQuoteDto.clientId && { client: { connect: { id: updateQuoteDto.clientId } } }),
            ...(updateQuoteDto.validUntil && { validUntil: new Date(updateQuoteDto.validUntil) }),
            ...(updateQuoteDto.notes !== undefined && { notes: updateQuoteDto.notes }),
            ...(updateQuoteDto.status && !isConverting && { status: updateQuoteDto.status }),
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
          
          // Delete existing production areas
          await tx.quoteItemProductionArea.deleteMany({
            where: { quoteItemId: item.id! },
          });
          
          // Update item
          await tx.quoteItem.update({
            where: { id: item.id! },
            data: {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: itemTotal,
              specifications: item.specifications || undefined,
              ...(item.productId && { productId: item.productId }),
              ...(item.sampleImageId !== undefined && { sampleImageId: item.sampleImageId }),
            },
          });
          
          // Create new production areas
          if (item.productionAreaIds && item.productionAreaIds.length > 0) {
            await tx.quoteItemProductionArea.createMany({
              data: item.productionAreaIds.map((areaId: string) => ({
                quoteItemId: item.id!,
                productionAreaId: areaId,
              })),
            });
          }
        }

        for (let i = 0; i < itemsToCreate.length; i++) {
          const item = itemsToCreate[i];
          const itemTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
          
          const createdItem = await tx.quoteItem.create({
            data: {
              quoteId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: itemTotal,
              specifications: item.specifications || undefined,
              sortOrder: currentItems.length - idsToDelete.length + i + 1,
              ...(item.productId && { productId: item.productId }),
              ...(item.sampleImageId && { sampleImageId: item.sampleImageId }),
            },
          });
          
          // Add production areas for new items
          if (item.productionAreaIds && item.productionAreaIds.length > 0) {
            await tx.quoteItemProductionArea.createMany({
              data: item.productionAreaIds.map((areaId: string) => ({
                quoteItemId: createdItem.id,
                productionAreaId: areaId,
              })),
            });
          }
        }

        await this.recalculateQuoteTotals(id, tx);
      });
    } else {
      await this.quotesRepository.update(id, {
        ...(updateQuoteDto.clientId && { client: { connect: { id: updateQuoteDto.clientId } } }),
        ...(updateQuoteDto.validUntil && { validUntil: new Date(updateQuoteDto.validUntil) }),
        ...(updateQuoteDto.notes !== undefined && { notes: updateQuoteDto.notes }),
        ...(updateQuoteDto.status && !isConverting && { status: updateQuoteDto.status }),
        ...(updateQuoteDto.commercialChannelId && {
          commercialChannel: { connect: { id: updateQuoteDto.commercialChannelId } },
        }),
      });
    }

    if (isConverting) {
      return this.convertToOrder(id, userId);
    }

    return this.findOne(id);
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
              sampleImageId: item.sampleImageId,
              sortOrder: item.sortOrder,
              productId: item.productId,
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

  async uploadItemSampleImage(
    quoteId: string,
    itemId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verify quote exists
    const quote = await this.findOne(quoteId);

    // Verify item belongs to this quote
    const item = await this.prisma.quoteItem.findFirst({
      where: {
        id: itemId,
        quoteId: quoteId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Quote item with ID ${itemId} not found in quote ${quoteId}`,
      );
    }

    // If item already has a sample image, delete it first
    if (item.sampleImageId) {
      try {
        await this.storageService.deleteFile(item.sampleImageId);
      } catch (error) {
        // Log error but continue - file might already be deleted
        console.error(
          `Failed to delete existing sample image ${item.sampleImageId}:`,
          error,
        );
      }
    }

    // Upload new image
    const uploadedFile = await this.storageService.uploadFile(file, {
      entityType: 'quote-item',
      entityId: itemId,
      userId,
    });

    // Update quote item with new image ID
    await this.prisma.quoteItem.update({
      where: { id: itemId },
      data: { sampleImageId: uploadedFile.id },
    });

    return uploadedFile;
  }

  async deleteItemSampleImage(quoteId: string, itemId: string) {
    // Verify quote exists
    const quote = await this.findOne(quoteId);

    // Verify item belongs to this quote
    const item = await this.prisma.quoteItem.findFirst({
      where: {
        id: itemId,
        quoteId: quoteId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Quote item with ID ${itemId} not found in quote ${quoteId}`,
      );
    }

    if (!item.sampleImageId) {
      throw new BadRequestException(
        `Quote item ${itemId} does not have a sample image`,
      );
    }

    // Delete file from storage
    await this.storageService.deleteFile(item.sampleImageId);

    // Remove reference from quote item
    await this.prisma.quoteItem.update({
      where: { id: itemId },
      data: { sampleImageId: null },
    });

    return { message: 'Sample image deleted successfully' };
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
        items: { include: { product: true } },
        client: true,
      },
    });
  }
}
