import { Injectable } from '@nestjs/common';
import { Prisma, SupplyLotStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { clampPageSize, MAX_PAGE_SIZE } from '../../common/dto/pagination.dto';
import {
  ACTIVE_LOT_STATUSES,
  FINISHED_LOT_STATUSES,
} from '../../common/utils/supply-lot-stock.util';
import { FilterSupplyLotsDto } from './dto';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
} as const;

/**
 * `select` explícito: un campo nuevo del modelo que no se liste aquí se guarda
 * pero nunca llega al frontend.
 */
export const supplyLotSelect = {
  id: true,
  supplyId: true,
  sequence: true,
  code: true,
  initialQuantity: true,
  remainingQuantity: true,
  lowStockQuantity: true,
  unitCost: true,
  totalCost: true,
  receivedAt: true,
  status: true,
  depletedAt: true,
  wasteQuantity: true,
  notes: true,
  voidReason: true,
  createdAt: true,
  updatedAt: true,
  supply: {
    select: {
      id: true,
      name: true,
      lotPrefix: true,
      consumptionUnit: { select: { id: true, name: true, abbreviation: true } },
    },
  },
  createdBy: { select: userSelect },
  expenseOrderItem: {
    select: {
      id: true,
      name: true,
      total: true,
      expenseOrder: { select: { id: true, ogNumber: true } },
    },
  },
} satisfies Prisma.SupplyLotSelect;

export type SupplyLotRecord = Prisma.SupplyLotGetPayload<{ select: typeof supplyLotSelect }>;

@Injectable()
export class SupplyLotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterSupplyLotsDto) {
    const { supplyId, view = 'active', search, page = 1, limit = 20 } = filters;
    const take = clampPageSize(limit, 20, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const where: Prisma.SupplyLotWhereInput = {};
    if (supplyId) where.supplyId = supplyId;
    if (search?.trim()) where.code = { contains: search.trim(), mode: 'insensitive' };

    if (view === 'active') {
      where.status = { in: ACTIVE_LOT_STATUSES };
    } else if (view === 'low') {
      where.status = { in: ACTIVE_LOT_STATUSES };
      // Comparación de columnas en SQL: el umbral está congelado en el lote.
      where.remainingQuantity = { lt: this.prisma.supplyLot.fields.lowStockQuantity };
    } else if (view === 'history') {
      where.status = { in: FINISHED_LOT_STATUSES };
    }

    // Activos: primero los que se acabarán antes (FIFO por ingreso).
    // Histórico: lo más reciente arriba.
    const orderBy: Prisma.SupplyLotOrderByWithRelationInput[] =
      view === 'history'
        ? [{ depletedAt: 'desc' }, { receivedAt: 'desc' }]
        : [{ receivedAt: 'asc' }, { sequence: 'asc' }];

    const [data, total] = await Promise.all([
      this.prisma.supplyLot.findMany({ where, select: supplyLotSelect, orderBy, skip, take }),
      this.prisma.supplyLot.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).supplyLot.findUnique({
      where: { id },
      select: supplyLotSelect,
    });
  }

  findMovements(lotId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: { lotId },
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        referenceType: true,
        referenceId: true,
        reason: true,
        notes: true,
        createdAt: true,
        performedBy: { select: userSelect },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Insumos controlados por lotes, activos, con sus lotes vigentes. */
  findLotSuppliesWithActiveLots() {
    return this.prisma.supply.findMany({
      where: { trackLots: true, isActive: true },
      select: {
        id: true,
        name: true,
        lotPrefix: true,
        lowStockPercent: true,
        currentStock: true,
        consumptionUnit: { select: { id: true, name: true, abbreviation: true } },
        lots: {
          where: { status: { in: ACTIVE_LOT_STATUSES } },
          select: {
            remainingQuantity: true,
            lowStockQuantity: true,
            unitCost: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Bloquea la fila del insumo hasta el fin de la transacción. Serializa el
   * cálculo del consecutivo del lote y el cambio de `currentStock`: dos
   * registros simultáneos del mismo insumo sacarían el mismo número.
   */
  async lockSupply(tx: Prisma.TransactionClient, supplyId: string) {
    const rows = await tx.$queryRaw<
      { id: string; name: string; is_active: boolean; track_lots: boolean; lot_prefix: string | null; low_stock_percent: Prisma.Decimal | null }[]
    >`SELECT id, name, is_active, track_lots, lot_prefix, low_stock_percent
      FROM supplies WHERE id = ${supplyId} FOR UPDATE`;
    return rows[0] ?? null;
  }

  /** Bloquea la fila del lote hasta el fin de la transacción. */
  async lockLot(tx: Prisma.TransactionClient, lotId: string) {
    await tx.$queryRaw`SELECT id FROM supply_lots WHERE id = ${lotId} FOR UPDATE`;
  }

  async nextSequence(tx: Prisma.TransactionClient, supplyId: string): Promise<number> {
    const agg = await tx.supplyLot.aggregate({
      where: { supplyId },
      _max: { sequence: true },
    });
    return (agg._max.sequence ?? 0) + 1;
  }

  /**
   * Monta el siguiente rollo (el más antiguo disponible) cuando el que estaba
   * en uso se acaba o se cierra. Si no hay ninguno, el insumo queda sin rollo
   * en uso y el consumo sigue por orden de ingreso.
   */
  async promoteNextLot(tx: Prisma.TransactionClient, supplyId: string) {
    const inUse = await tx.supplyLot.count({
      where: { supplyId, status: SupplyLotStatus.IN_USE },
    });
    if (inUse > 0) return null;
    const next = await tx.supplyLot.findFirst({
      where: { supplyId, status: SupplyLotStatus.AVAILABLE, remainingQuantity: { gt: 0 } },
      orderBy: [{ receivedAt: 'asc' }, { sequence: 'asc' }],
      select: { id: true },
    });
    if (!next) return null;
    await tx.supplyLot.update({ where: { id: next.id }, data: { status: SupplyLotStatus.IN_USE } });
    return next.id;
  }

  /**
   * Líneas de OG que pueden haber comprado un rollo: no amarradas a otro lote,
   * buscadas por número de OG o nombre/descripción de la línea.
   */
  findPurchaseLines(search?: string) {
    const term = search?.trim();
    return this.prisma.expenseOrderItem.findMany({
      where: {
        supplyLot: null,
        ...(term && {
          OR: [
            { expenseOrder: { ogNumber: { contains: term, mode: 'insensitive' } } },
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        quantity: true,
        total: true,
        createdAt: true,
        expenseOrder: { select: { id: true, ogNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /** Movimientos del lote distintos de su entrada: si hay, ya se usó. */
  countNonEntryMovements(tx: Prisma.TransactionClient, lotId: string) {
    return tx.inventoryMovement.count({
      where: { lotId, NOT: { type: 'ENTRY' } },
    });
  }
}
