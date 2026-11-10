import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementType,
  Prisma,
  SupplyLotStatus,
} from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import {
  ACTIVE_LOT_STATUSES,
  computeLotDisplayStatus,
  computeLowStockQuantity,
  DEFAULT_LOT_LOW_STOCK_PERCENT,
  resolveLotCosts,
} from '../../common/utils/supply-lot-stock.util';
import { startOfDay } from '../../common/utils/date-range.util';
import { CreateSupplyLotDto, FilterSupplyLotsDto, VoidSupplyLotDto } from './dto';
import { SupplyLotRecord, SupplyLotsRepository } from './supply-lots.repository';

/** `referenceType` de los movimientos que nacen en este módulo. */
export const SUPPLY_LOT_REFERENCE = 'SUPPLY_LOT';
/** `referenceType` del ajuste que saca el saldo al cerrar un lote. */
export const LOT_CLOSE_REFERENCE = 'LOT_CLOSE';

@Injectable()
export class SupplyLotsService {
  constructor(
    private readonly repository: SupplyLotsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filters: FilterSupplyLotsDto) {
    const { data, meta } = await this.repository.findAll(filters);
    return { data: data.map((lot) => this.toResponse(lot)), meta };
  }

  async findOne(id: string) {
    const lot = await this.repository.findById(id);
    if (!lot) throw new NotFoundException(`Lote con id ${id} no encontrado`);

    const movements = await this.repository.findMovements(id);
    return {
      ...this.toResponse(lot),
      movements: movements.map((m) => ({
        ...m,
        quantity: Number(m.quantity),
        unitCost: m.unitCost === null ? null : Number(m.unitCost),
      })),
    };
  }

  /**
   * Resumen por insumo controlado por lotes: saldo, valor del saldo, lotes
   * vigentes y cuántos están bajos. Alimenta las tarjetas de la vista y el
   * selector de insumo del formulario.
   */
  async getSummary() {
    const supplies = await this.repository.findLotSuppliesWithActiveLots();
    return supplies.map((supply) => {
      let remaining = new Prisma.Decimal(0);
      let value = new Prisma.Decimal(0);
      let lowLots = 0;
      for (const lot of supply.lots) {
        remaining = remaining.add(lot.remainingQuantity);
        value = value.add(new Prisma.Decimal(lot.remainingQuantity).mul(lot.unitCost));
        if (computeLotDisplayStatus(lot) === 'LOW') lowLots++;
      }
      return {
        supplyId: supply.id,
        supplyName: supply.name,
        lotPrefix: supply.lotPrefix,
        unit: supply.consumptionUnit,
        lowStockPercent:
          supply.lowStockPercent === null
            ? DEFAULT_LOT_LOW_STOCK_PERCENT
            : Number(supply.lowStockPercent),
        activeLots: supply.lots.length,
        lowLots,
        remainingQuantity: Number(remaining),
        remainingValue: Number(value.toDecimalPlaces(2)),
      };
    });
  }

  /**
   * Registra un lote (rollo) nuevo: crea el lote, suma su cantidad al stock del
   * insumo y deja la entrada en el kardex, todo en una transacción.
   */
  async create(dto: CreateSupplyLotDto, userId: string) {
    const quantity = new Prisma.Decimal(dto.initialQuantity);

    let costs: { unitCost: Prisma.Decimal; totalCost: Prisma.Decimal };
    try {
      costs = resolveLotCosts(quantity, dto);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const lotId = await this.prisma.$transaction(async (tx) => {
      const supply = await this.repository.lockSupply(tx, dto.supplyId);
      if (!supply) throw new NotFoundException(`Insumo con id ${dto.supplyId} no encontrado`);
      if (!supply.is_active) {
        throw new BadRequestException(`El insumo "${supply.name}" no está activo`);
      }
      if (!supply.track_lots) {
        throw new BadRequestException(
          `El insumo "${supply.name}" no se controla por lotes. Actívalo en el insumo o registra la entrada desde Movimientos de Inventario.`,
        );
      }

      const sequence = await this.repository.nextSequence(tx, dto.supplyId);
      const prefix = supply.lot_prefix?.trim() || `LOTE-${supply.id.slice(0, 4).toUpperCase()}`;
      const code = `${prefix}-${String(sequence).padStart(4, '0')}`;

      const lot = await tx.supplyLot.create({
        data: {
          supplyId: dto.supplyId,
          sequence,
          code,
          initialQuantity: quantity,
          remainingQuantity: quantity,
          lowStockQuantity: computeLowStockQuantity(quantity, supply.low_stock_percent),
          unitCost: costs.unitCost,
          totalCost: costs.totalCost,
          // `YYYY-MM-DD` es el día en Bogotá, no medianoche UTC (que sería el
          // día anterior a las 7 p. m.).
          receivedAt: startOfDay(dto.receivedAt) as Date,
          notes: dto.notes?.trim() || null,
          createdById: userId,
        },
        select: { id: true },
      });

      const updated = await tx.supply.update({
        where: { id: dto.supplyId },
        data: { currentStock: { increment: quantity } },
        select: { currentStock: true },
      });
      const newStock = new Prisma.Decimal(updated.currentStock);

      await tx.inventoryMovement.create({
        data: {
          supplyId: dto.supplyId,
          lotId: lot.id,
          type: InventoryMovementType.ENTRY,
          quantity,
          unitCost: costs.unitCost,
          previousStock: newStock.sub(quantity),
          newStock,
          referenceType: SUPPLY_LOT_REFERENCE,
          referenceId: lot.id,
          reason: `Ingreso del lote ${code}`,
          notes: dto.notes?.trim() || undefined,
          performedById: userId,
        },
      });

      // Si no hay rollo montado, queda montado el más antiguo con saldo.
      await this.repository.promoteNextLot(tx, dto.supplyId);

      return lot.id;
    });

    return this.findOne(lotId);
  }

  /**
   * Anula un lote mal registrado. Solo si nunca se usó: su saldo sale del stock
   * con un ajuste y el lote queda como `VOIDED`, sin borrarse.
   */
  async void(id: string, dto: VoidSupplyLotDto, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.repository.findById(id, tx);
      if (!existing) throw new NotFoundException(`Lote con id ${id} no encontrado`);

      // Orden de bloqueo fijo (insumo → lote) para no cruzarse con el registro.
      await this.repository.lockSupply(tx, existing.supplyId);
      await this.repository.lockLot(tx, id);
      const lot = await this.repository.findById(id, tx);
      if (!lot) throw new NotFoundException(`Lote con id ${id} no encontrado`);

      if (!ACTIVE_LOT_STATUSES.includes(lot.status)) {
        throw new BadRequestException(`El lote ${lot.code} ya está ${this.statusLabel(lot.status)}`);
      }
      const used = await this.repository.countNonEntryMovements(tx, id);
      if (used > 0 || !new Prisma.Decimal(lot.remainingQuantity).equals(lot.initialQuantity)) {
        throw new BadRequestException(
          `El lote ${lot.code} ya tiene consumos o ajustes: no se puede anular.`,
        );
      }

      const quantity = new Prisma.Decimal(lot.remainingQuantity);
      const updated = await tx.supply.update({
        where: { id: lot.supplyId },
        data: { currentStock: { decrement: quantity } },
        select: { currentStock: true },
      });
      const newStock = new Prisma.Decimal(updated.currentStock);

      await tx.inventoryMovement.create({
        data: {
          supplyId: lot.supplyId,
          lotId: id,
          type: InventoryMovementType.ADJUSTMENT,
          quantity,
          unitCost: lot.unitCost,
          previousStock: newStock.add(quantity),
          newStock,
          referenceType: SUPPLY_LOT_REFERENCE,
          referenceId: id,
          reason: `Anulación del lote ${lot.code}: ${dto.reason.trim()}`,
          performedById: userId,
        },
      });

      await tx.supplyLot.update({
        where: { id },
        data: {
          status: SupplyLotStatus.VOIDED,
          remainingQuantity: 0,
          depletedAt: new Date(),
          voidReason: dto.reason.trim(),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Monta este rollo en la máquina: es del que sale el consumo de las OP. Solo
   * hay uno en uso por insumo; el que estaba pasa a disponible.
   */
  async setInUse(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.repository.findById(id, tx);
      if (!existing) throw new NotFoundException(`Lote con id ${id} no encontrado`);
      await this.repository.lockSupply(tx, existing.supplyId);
      const lot = await this.repository.findById(id, tx);
      if (!lot) throw new NotFoundException(`Lote con id ${id} no encontrado`);
      if (lot.status === SupplyLotStatus.IN_USE) return;
      if (lot.status !== SupplyLotStatus.AVAILABLE || new Prisma.Decimal(lot.remainingQuantity).isZero()) {
        throw new BadRequestException(`El lote ${lot.code} está ${this.statusLabel(lot.status)}: no se puede montar.`);
      }
      await tx.supplyLot.updateMany({
        where: { supplyId: lot.supplyId, status: SupplyLotStatus.IN_USE },
        data: { status: SupplyLotStatus.AVAILABLE },
      });
      await tx.supplyLot.update({ where: { id }, data: { status: SupplyLotStatus.IN_USE } });
    });
    return this.findOne(id);
  }

  /**
   * Cierra el rollo: lo que le quedaba sale del inventario como merma (fin del
   * rollo, pruebas de color, reimpresiones). Esa merma no se carga a ninguna OP.
   */
  async close(id: string, dto: VoidSupplyLotDto, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await this.repository.findById(id, tx);
      if (!existing) throw new NotFoundException(`Lote con id ${id} no encontrado`);
      await this.repository.lockSupply(tx, existing.supplyId);
      await this.repository.lockLot(tx, id);
      const lot = await this.repository.findById(id, tx);
      if (!lot) throw new NotFoundException(`Lote con id ${id} no encontrado`);
      if (!ACTIVE_LOT_STATUSES.includes(lot.status)) {
        throw new BadRequestException(`El lote ${lot.code} ya está ${this.statusLabel(lot.status)}`);
      }

      const waste = new Prisma.Decimal(lot.remainingQuantity);
      if (waste.greaterThan(0)) {
        const updated = await tx.supply.update({
          where: { id: lot.supplyId },
          data: { currentStock: { decrement: waste } },
          select: { currentStock: true },
        });
        const newStock = new Prisma.Decimal(updated.currentStock);
        await tx.inventoryMovement.create({
          data: {
            supplyId: lot.supplyId,
            lotId: id,
            type: InventoryMovementType.ADJUSTMENT,
            quantity: waste,
            unitCost: lot.unitCost,
            previousStock: newStock.add(waste),
            newStock,
            referenceType: LOT_CLOSE_REFERENCE,
            referenceId: id,
            reason: `Cierre del lote ${lot.code} (merma): ${dto.reason.trim()}`,
            performedById: userId,
          },
        });
      }

      await tx.supplyLot.update({
        where: { id },
        data: {
          status: SupplyLotStatus.CLOSED,
          remainingQuantity: 0,
          wasteQuantity: { increment: waste },
          depletedAt: new Date(),
        },
      });
      if (lot.status === SupplyLotStatus.IN_USE) {
        await this.repository.promoteNextLot(tx, lot.supplyId);
      }
    });
    return this.findOne(id);
  }

  private statusLabel(status: SupplyLotStatus): string {
    const labels: Record<SupplyLotStatus, string> = {
      AVAILABLE: 'disponible',
      IN_USE: 'en uso',
      DEPLETED: 'agotado',
      CLOSED: 'cerrado',
      VOIDED: 'anulado',
    };
    return labels[status];
  }

  private toResponse(lot: SupplyLotRecord) {
    const initial = new Prisma.Decimal(lot.initialQuantity);
    const remaining = new Prisma.Decimal(lot.remainingQuantity);
    const waste = new Prisma.Decimal(lot.wasteQuantity);
    // Los anulados nunca se consumieron: su saldo salió por anulación, no por uso.
    const voided = lot.status === SupplyLotStatus.VOIDED;
    // Usado = lo que ya no está en el rollo (consumo de OP + merma).
    const used = voided ? new Prisma.Decimal(0) : initial.sub(remaining);
    const consumed = voided ? new Prisma.Decimal(0) : used.sub(waste);

    return {
      id: lot.id,
      code: lot.code,
      sequence: lot.sequence,
      supply: lot.supply,
      status: lot.status,
      displayStatus: computeLotDisplayStatus(lot),
      initialQuantity: Number(initial),
      remainingQuantity: Number(remaining),
      consumedQuantity: Number(consumed),
      wasteQuantity: Number(waste),
      wasteValue: Number(waste.mul(lot.unitCost).toDecimalPlaces(2)),
      consumedPercent: Number(used.div(initial).mul(100).toDecimalPlaces(2)),
      lowStockQuantity: Number(lot.lowStockQuantity),
      unitCost: Number(lot.unitCost),
      totalCost: Number(lot.totalCost),
      remainingValue: Number(remaining.mul(lot.unitCost).toDecimalPlaces(2)),
      receivedAt: lot.receivedAt,
      depletedAt: lot.depletedAt,
      notes: lot.notes,
      voidReason: lot.voidReason,
      createdBy: lot.createdBy,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
    };
  }
}
