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
import { DtfStatus, Prisma } from '../../generated/prisma';
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

    const unitPrice = product.basePrice ?? new Prisma.Decimal(0);
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

    if (dto.quantity !== undefined) {
      updates.quantity = new Prisma.Decimal(dto.quantity);
      const unitPrice = record.unitPrice;
      updates.value = unitPrice.mul(updates.quantity);
    }

    return this.dtfRepository.update(id, updates);
  }

  async changeStatus(id: string, dto: ChangeDtfStatusDto) {
    const record = await this.dtfRepository.findByIdRaw(id);
    if (!record) throw new NotFoundException(`Registro DTF con id ${id} no encontrado`);

    if (!isValidDtfTransition(record.status, dto.status)) {
      throw new BadRequestException(
        `Transición de estado inválida: ${record.status} → ${dto.status}`,
      );
    }

    return this.dtfRepository.updateStatus(id, dto.status);
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

    const order = await this.ordersService.create(
      {
        clientId: record.clientId,
        items: [
          {
            description: `${product?.name ?? 'DTF'} - ${record.consecutive}`,
            quantity: Number(record.quantity),
            unitPrice: Number(record.unitPrice),
            productId: record.productId,
          },
        ],
        taxRate: 0,
      },
      userId,
    );

    await this.dtfRepository.updateStatus(id, DtfStatus.CONVERTIDA_EN_OP, order?.id);

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
