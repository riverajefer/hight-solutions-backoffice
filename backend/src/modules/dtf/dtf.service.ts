import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DtfRepository, DtfFilters } from './dtf.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { StorageService } from '../storage/storage.service';
import { OrdersService } from '../orders/orders.service';
import { CreateDtfRecordDto, BulkCreateDtfDto } from './dto/create-dtf-record.dto';
import { UpdateDtfRecordDto } from './dto/update-dtf-record.dto';
import { ChangeDtfStatusDto } from './dto/change-dtf-status.dto';
import { DtfStatus, PaymentMethod, Prisma } from '../../generated/prisma';
import { isValidDtfTransition } from './dtf-status-transitions';

@Injectable()
export class DtfService {
  constructor(
    private readonly dtfRepository: DtfRepository,
    private readonly prisma: PrismaService,
    private readonly consecutivesService: ConsecutivesService,
    private readonly storageService: StorageService,
    private readonly ordersService: OrdersService,
  ) {}

  async findAll(filters: DtfFilters) {
    return this.dtfRepository.findAllWithFilters(filters);
  }

  async findOne(id: string) {
    const record = await this.dtfRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);
    }
    return record;
  }

  async bulkCreate(dto: BulkCreateDtfDto, userId: string) {
    const created = await Promise.all(
      dto.items.map((item) => this.createOne(item, userId)),
    );
    return created;
  }

  private async createOne(dto: CreateDtfRecordDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto con id ${dto.productId} no encontrado`);
    }

    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente con id ${dto.clientId} no encontrado`);
    }

    const consecutiveType = this.getConsecutiveType(product.name);
    const consecutive = await this.consecutivesService.generateNumber(consecutiveType);

    const unitPrice = dto.unitPrice != null
      ? new Prisma.Decimal(dto.unitPrice)
      : (product.basePrice ?? new Prisma.Decimal(0));
    const quantity = new Prisma.Decimal(dto.quantity);
    const value = unitPrice.mul(quantity);

    return this.dtfRepository.create({
      consecutive,
      productId: dto.productId,
      clientId: dto.clientId,
      quantity,
      unitPrice,
      value,
      createdById: userId,
      notes: dto.notes,
    });
  }

  async update(id: string, dto: UpdateDtfRecordDto) {
    const record = await this.dtfRepository.findByIdRaw(id);
    if (!record) throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);

    if (record.status !== DtfStatus.BORRADOR) {
      throw new ForbiddenException('Solo se pueden editar registros en estado BORRADOR');
    }

    const updates: Parameters<DtfRepository['update']>[1] = {};

    if (dto.clientId !== undefined) updates.clientId = dto.clientId;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    if (dto.unitPrice !== undefined) {
      updates.unitPrice = new Prisma.Decimal(dto.unitPrice);
    }

    if (dto.quantity !== undefined || dto.unitPrice !== undefined) {
      const qty = dto.quantity !== undefined
        ? new Prisma.Decimal(dto.quantity)
        : record.quantity;
      const price = updates.unitPrice ?? record.unitPrice;
      updates.quantity = qty;
      updates.value = price.mul(qty);
    }

    return this.dtfRepository.update(id, updates);
  }

  async changeStatus(id: string, dto: ChangeDtfStatusDto, changedById: string) {
    const record = await this.dtfRepository.findByIdRaw(id);
    if (!record) throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);

    if (!isValidDtfTransition(record.status, dto.status)) {
      throw new BadRequestException(
        `Transición de estado inválida: ${record.status} → ${dto.status}`,
      );
    }

    const result = await this.dtfRepository.updateStatus(id, dto.status);
    await this.dtfRepository.createStatusHistory({
      dtfId: id,
      fromStatus: record.status,
      toStatus: dto.status,
      changedById,
    });
    return result;
  }

  async getStatusHistory(id: string) {
    const record = await this.dtfRepository.findByIdRaw(id);
    if (!record) throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);
    return this.dtfRepository.getStatusHistory(id);
  }

  async convertToOrder(id: string, userId: string) {
    const record = await this.dtfRepository.findByIdRaw(id);
    if (!record) throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);

    if (record.status === DtfStatus.CONVERTIDA_EN_OP) {
      throw new BadRequestException('Este registro ya fue convertido en Orden de Pedido');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: record.productId },
    });

    // Resolve production area by product type (DTF UV vs DTF Textil)
    const productionAreaName = product?.name?.toLowerCase().includes('uv')
      ? 'DTF UV'
      : 'DTF Textil';
    const productionArea = await this.prisma.productionArea.findFirst({
      where: { name: { contains: productionAreaName, mode: 'insensitive' } },
    });

    // Fetch DTF files before creating the order
    const [dtfImages, dtfComprobantes] = await Promise.all([
      this.storageService.getFilesByEntity('DTF_IMAGE', id),
      this.storageService.getFilesByEntity('DTF_COMPROBANTE', id),
    ]);

    const dtfImage = dtfImages[0] ?? null;
    const dtfComprobante = dtfComprobantes[0] ?? null;

    const order = await this.ordersService.create(
      {
        clientId: record.clientId,
        notes: `[DTF] ${record.consecutive}`,
        items: [
          {
            description: `${product?.name ?? 'DTF'} - ${record.consecutive}`,
            quantity: Number(record.quantity),
            unitPrice: Number(record.unitPrice),
            productId: record.productId,
            ...(productionArea && { productionAreaIds: [productionArea.id] }),
          },
        ],
        taxRate: 0,
      },
      userId,
    );

    // Transfer reference image → order item sampleImageId
    if (dtfImage && order?.items?.[0]) {
      const orderItem = order.items[0] as { id: string };
      await this.prisma.uploadedFile.update({
        where: { id: dtfImage.id },
        data: { entityType: 'order-item', entityId: orderItem.id },
      });
      await this.prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { sampleImageId: dtfImage.id },
      });
    }

    // Transfer comprobante → create advance payment + attach receipt file
    // Done directly via Prisma to avoid cash-session / receipt_number machinery
    if (dtfComprobante && order?.id) {
      const dtfValue = new Prisma.Decimal(Number(record.value));

      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: dtfValue,
          paymentMethod: PaymentMethod.TRANSFER,
          reference: record.consecutive,
          notes: `Anticipo DTF ${record.consecutive}`,
          receivedById: userId,
        },
      });

      // Keep order totals in sync
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paidAmount: { increment: dtfValue },
          balance: { decrement: dtfValue },
        },
      });

      // Reassign the comprobante file to the new payment
      await this.prisma.uploadedFile.update({
        where: { id: dtfComprobante.id },
        data: { entityType: 'payment', entityId: payment.id },
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { receiptFileId: dtfComprobante.id },
      });
    }

    await this.dtfRepository.updateStatus(id, DtfStatus.CONVERTIDA_EN_OP, order?.id);
    await this.dtfRepository.createStatusHistory({
      dtfId: id,
      fromStatus: record.status,
      toStatus: DtfStatus.CONVERTIDA_EN_OP,
      changedById: userId,
    });

    return order;
  }

  async uploadImage(id: string, file: Express.Multer.File, userId: string) {
    await this.findOne(id);
    return this.storageService.uploadFile(file, {
      entityType: 'DTF_IMAGE',
      entityId: id,
      userId,
    });
  }

  async uploadComprobante(id: string, file: Express.Multer.File, userId: string) {
    await this.findOne(id);
    return this.storageService.uploadFile(file, {
      entityType: 'DTF_COMPROBANTE',
      entityId: id,
      userId,
    });
  }

  async getFiles(id: string) {
    await this.findOne(id);
    const [images, comprobantes] = await Promise.all([
      this.storageService.getFilesByEntity('DTF_IMAGE', id),
      this.storageService.getFilesByEntity('DTF_COMPROBANTE', id),
    ]);
    return { images, comprobantes };
  }

  private getConsecutiveType(productName: string): 'DTF_TEXTIL' | 'DTF_UV' {
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('uv')) return 'DTF_UV';
    return 'DTF_TEXTIL';
  }
}
