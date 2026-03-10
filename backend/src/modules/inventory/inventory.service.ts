import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, InventoryMovementType, NotificationType } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryRepository } from './inventory.repository';
import { CreateInventoryMovementDto, FilterInventoryMovementsDto } from './dto';

// Tipos que incrementan el stock
const STOCK_INCREASE_TYPES: InventoryMovementType[] = [
  InventoryMovementType.ENTRY,
  InventoryMovementType.RETURN,
  InventoryMovementType.INITIAL,
];

// Tipos que decrementan el stock
const STOCK_DECREASE_TYPES: InventoryMovementType[] = [
  InventoryMovementType.EXIT,
  InventoryMovementType.ADJUSTMENT,
];

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly repository: InventoryRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Crea un movimiento de inventario manual (no EXIT, que es automático).
   */
  async createManualMovement(dto: CreateInventoryMovementDto, performedById: string) {
    if (dto.type === InventoryMovementType.EXIT) {
      throw new BadRequestException(
        'El tipo EXIT es generado automáticamente por el sistema al completar una Orden de Trabajo.',
      );
    }
    return this.createMovement(dto, performedById);
  }

  /**
   * Crea movimientos de salida (EXIT) para todos los insumos de una OT al completarla.
   * Se ejecuta dentro de la transacción de updateStatus en WorkOrdersService.
   */
  async createExitFromWorkOrder(
    workOrderId: string,
    performedById: string,
    tx: Prisma.TransactionClient,
  ) {
    // Obtener todos los insumos de la OT con sus cantidades
    const supplies = await tx.workOrderItemSupply.findMany({
      where: {
        workOrderItem: { workOrderId },
        quantity: { not: null, gt: 0 },
      },
      include: {
        supply: { select: { id: true, name: true, currentStock: true, minimumStock: true } },
      },
    });

    if (supplies.length === 0) return;

    for (const ws of supplies) {
      if (!ws.quantity) continue;

      const qty = new Prisma.Decimal(ws.quantity);
      const previousStock = new Prisma.Decimal(ws.supply.currentStock);
      const newStock = Prisma.Decimal.max(previousStock.sub(qty), new Prisma.Decimal(0));

      await tx.inventoryMovement.create({
        data: {
          supplyId: ws.supplyId,
          type: InventoryMovementType.EXIT,
          quantity: qty,
          previousStock,
          newStock,
          referenceType: 'WORK_ORDER',
          referenceId: workOrderId,
          performedById,
          notes: `Consumo automático al completar OT`,
        },
      });

      await tx.supply.update({
        where: { id: ws.supplyId },
        data: { currentStock: newStock },
      });

      // Alerta de stock bajo (fire & forget, fuera de la tx para no bloquearla)
      if (newStock.lt(ws.supply.minimumStock)) {
        this.notifyLowStock(ws.supply.id, ws.supply.name, Number(newStock), Number(ws.supply.minimumStock)).catch(
          (err) => this.logger.error(`Error notificando stock bajo para ${ws.supply.name}`, err),
        );
      }
    }
  }

  /**
   * Crea un movimiento de inventario con toda la logica de negocio.
   * Puede recibir un cliente de transaccion opcional.
   */
  async createMovement(
    dto: CreateInventoryMovementDto,
    performedById: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const supply = await client.supply.findUnique({
      where: { id: dto.supplyId },
      select: { id: true, name: true, currentStock: true, minimumStock: true, isActive: true },
    });

    if (!supply) throw new NotFoundException(`Insumo con id ${dto.supplyId} no encontrado`);
    if (!supply.isActive) throw new BadRequestException(`El insumo "${supply.name}" no está activo`);

    if (dto.type === InventoryMovementType.ADJUSTMENT && !dto.reason) {
      throw new BadRequestException('El campo "reason" es requerido para ajustes manuales (ADJUSTMENT)');
    }

    const qty = new Prisma.Decimal(dto.quantity);
    const previousStock = new Prisma.Decimal(supply.currentStock);

    let newStock: Prisma.Decimal;
    if (STOCK_INCREASE_TYPES.includes(dto.type)) {
      newStock = previousStock.add(qty);
    } else {
      newStock = previousStock.sub(qty);
      if (newStock.lt(0)) {
        throw new BadRequestException(
          `Stock insuficiente. Stock actual: ${previousStock}, cantidad solicitada: ${qty}`,
        );
      }
    }

    const movementData: Prisma.InventoryMovementUncheckedCreateInput = {
      supplyId: dto.supplyId,
      type: dto.type,
      quantity: qty,
      unitCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : undefined,
      previousStock,
      newStock,
      referenceType: 'MANUAL',
      reason: dto.reason,
      notes: dto.notes,
      performedById,
    };

    // Crear movimiento y actualizar stock atomicamente
    const [movement] = await Promise.all([
      this.repository.create(movementData, client as any),
      client.supply.update({
        where: { id: dto.supplyId },
        data: { currentStock: newStock },
      }),
    ]);

    // Alerta de stock bajo (fire & forget)
    if (newStock.lt(supply.minimumStock)) {
      this.notifyLowStock(supply.id, supply.name, Number(newStock), Number(supply.minimumStock)).catch(
        (err) => this.logger.error(`Error notificando stock bajo para ${supply.name}`, err),
      );
    }

    return movement;
  }

  async findAll(filters: FilterInventoryMovementsDto) {
    return this.repository.findAll(filters);
  }

  async findById(id: string) {
    const movement = await this.repository.findById(id);
    if (!movement) throw new NotFoundException(`Movimiento con id ${id} no encontrado`);
    return movement;
  }

  async getLowStockSupplies() {
    return this.repository.getLowStockSuppliesRaw();
  }

  async getInventoryValuation() {
    return this.repository.getInventoryValuation();
  }

  /**
   * Verifica todos los insumos activos y notifica los que están bajo mínimo.
   * Llamado por el scheduler diario.
   */
  async checkAndNotifyAllLowStock() {
    const lowStock = await this.repository.getLowStockSuppliesRaw();
    if (lowStock.length === 0) return 0;

    let notified = 0;
    for (const supply of lowStock) {
      try {
        await this.notifyLowStock(supply.id, supply.name, supply.current_stock, supply.minimum_stock);
        notified++;
      } catch (err) {
        this.logger.error(`Error notificando stock bajo para ${supply.name}`, err);
      }
    }
    return notified;
  }

  private async notifyLowStock(
    supplyId: string,
    supplyName: string,
    currentStock: number,
    minimumStock: number,
  ) {
    await this.notificationsService.notifyUsersWithPermission('manage_inventory', {
      type: NotificationType.LOW_STOCK_ALERT,
      title: `Stock bajo: ${supplyName}`,
      message: `El insumo "${supplyName}" tiene stock bajo (${currentStock} unidades). Mínimo requerido: ${minimumStock}.`,
      relatedId: supplyId,
      relatedType: 'SUPPLY',
    });
  }
}
