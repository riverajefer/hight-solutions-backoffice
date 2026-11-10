import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementType,
  MaterialConsumptionSource,
  NotificationType,
  OrderStatus,
  Prisma,
  SupplyLotStatus,
} from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { lockOrderForUpdate } from '../../common/utils/order-lock.util';
import { ACTIVE_LOT_STATUSES } from '../../common/utils/supply-lot-stock.util';
import { NotificationsService } from '../notifications/notifications.service';
import { SupplyLotsRepository } from '../supply-lots/supply-lots.repository';

type Tx = Prisma.TransactionClient;
const ZERO = new Prisma.Decimal(0);

/** `referenceType` de los movimientos que nacen de un consumo de OP. */
export const ORDER_CONSUMPTION_REFERENCE = 'ORDER';

/** Un lote cruzó su umbral de inventario bajo. Se avisa después del commit. */
interface LotLowAlert {
  lotId: string;
  code: string;
  supplyName: string;
  remaining: Prisma.Decimal;
}

interface ConsumptionRow {
  id: string;
  orderItemId: string | null;
  supplyId: string;
  lotId: string | null;
  quantity: Prisma.Decimal;
  source: MaterialConsumptionSource;
  createdAt: Date;
}

/** Contexto de un grupo (ítem × insumo) cuyo consumo se ajusta. */
interface GroupContext {
  orderId: string;
  orderNumber: string;
  orderItemId: string | null;
  supplyId: string;
  source: MaterialConsumptionSource;
  userId: string;
}

/**
 * Motor de consumo de material contra el ítem de OP.
 *
 * Funciona por **reconciliación**: `syncOrder` calcula cuánto debería consumir
 * cada ítem (regla del producto, corrección manual, OP anulada, ítem borrado),
 * lo compara con lo registrado y mueve solo la diferencia. Así es idempotente:
 * un reintento, un doble clic o una edición no duplican nada, y basta con
 * llamarlo después de cualquier cambio de la OP.
 *
 * Orden de bloqueo, siempre el mismo para no cruzarse: OP → insumos (por id)
 * → lotes (implícito al escribirlos). Nada toma una OP teniendo un insumo.
 */
@Injectable()
export class MaterialConsumptionService {
  private readonly logger = new Logger(MaterialConsumptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lotsRepository: SupplyLotsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Sincronización desde la OP
  // ---------------------------------------------------------------------------

  /**
   * Deja el consumo de la OP en lo que corresponde hoy. Se llama al terminar
   * crear/editar la OP, sus ítems y su estado.
   */
  async syncOrder(orderId: string, userId?: string): Promise<void> {
    const alerts: LotLowAlert[] = [];

    await this.prisma.$transaction(async (tx) => {
      await lockOrderForUpdate(tx, orderId);
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdById: true,
          items: { select: { id: true, productId: true, quantity: true } },
        },
      });
      if (!order) return;

      const productIds = [
        ...new Set(order.items.map((i) => i.productId).filter((p): p is string => !!p)),
      ];
      const rules = productIds.length
        ? await tx.productSupplyRule.findMany({
            where: {
              productId: { in: productIds },
              isActive: true,
              autoConsume: true,
              supply: { trackLots: true, isActive: true },
            },
            select: { productId: true, supplyId: true, factor: true },
          })
        : [];

      const rows = await tx.materialConsumption.findMany({
        where: { orderId },
        select: this.rowSelect,
      });

      const annulled = order.status === OrderStatus.ANULADO;
      const groups = new Map<string, { itemId: string | null; supplyId: string; desired: Prisma.Decimal | null }>();
      const key = (itemId: string | null, supplyId: string) => `${itemId ?? 'orphan'}|${supplyId}`;

      // Lo que dicen las reglas para cada ítem vivo.
      if (!annulled) {
        for (const item of order.items) {
          for (const rule of rules.filter((r) => r.productId === item.productId)) {
            groups.set(key(item.id, rule.supplyId), {
              itemId: item.id,
              supplyId: rule.supplyId,
              desired: new Prisma.Decimal(item.quantity).mul(rule.factor).toDecimalPlaces(4),
            });
          }
        }
      }

      // Lo ya registrado: lo que no tiene regla vigente vuelve a cero, salvo una
      // corrección manual de un ítem vivo, que se respeta tal cual.
      const itemIds = new Set(order.items.map((i) => i.id));
      for (const row of rows) {
        const k = key(row.orderItemId, row.supplyId);
        const group = groups.get(k);
        const alive = !annulled && row.orderItemId !== null && itemIds.has(row.orderItemId);
        if (!alive) {
          groups.set(k, { itemId: row.orderItemId, supplyId: row.supplyId, desired: ZERO });
        } else if (row.source === MaterialConsumptionSource.MANUAL) {
          groups.set(k, { itemId: row.orderItemId, supplyId: row.supplyId, desired: null });
        } else if (!group) {
          groups.set(k, { itemId: row.orderItemId, supplyId: row.supplyId, desired: ZERO });
        }
      }

      const pending = [...groups.values()].filter((g) => g.desired !== null);
      if (pending.length === 0) return;

      await this.lockSupplies(tx, pending.map((g) => g.supplyId));
      const actor = userId ?? order.createdById;

      for (const group of pending) {
        const groupRows = rows.filter(
          (r) => r.orderItemId === group.itemId && r.supplyId === group.supplyId,
        );
        await this.adjustGroup(
          tx,
          {
            orderId,
            orderNumber: order.orderNumber,
            orderItemId: group.itemId,
            supplyId: group.supplyId,
            source: MaterialConsumptionSource.AUTO,
            userId: actor,
          },
          groupRows,
          group.desired as Prisma.Decimal,
          alerts,
        );
      }
    });

    this.notifyLowLots(alerts);
  }

  /**
   * Devuelve todo el material de la OP. Se usa antes de borrar un borrador: la
   * FK de la OP es `Restrict` justamente para no perder consumos en el borrado.
   */
  async releaseOrder(orderId: string, userId?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockOrderForUpdate(tx, orderId);
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, createdById: true },
      });
      if (!order) return;
      const rows = await tx.materialConsumption.findMany({
        where: { orderId },
        select: this.rowSelect,
      });
      if (rows.length === 0) return;

      await this.lockSupplies(tx, rows.map((r) => r.supplyId));
      const groups = new Map<string, ConsumptionRow[]>();
      for (const r of rows) {
        const k = `${r.orderItemId}|${r.supplyId}`;
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      for (const groupRows of groups.values()) {
        await this.adjustGroup(
          tx,
          {
            orderId,
            orderNumber: order.orderNumber,
            orderItemId: groupRows[0].orderItemId,
            supplyId: groupRows[0].supplyId,
            source: groupRows[0].source,
            userId: userId ?? order.createdById,
          },
          groupRows,
          ZERO,
          [],
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Corrección manual y bandeja de pendientes
  // ---------------------------------------------------------------------------

  /**
   * Corrige a mano cuánto material usó un ítem (p. ej. stickers vendidos por
   * unidad). Con `quantity: null` vuelve al cálculo automático de la regla.
   */
  async correctItem(
    orderItemId: string,
    supplyId: string,
    quantity: number | null,
    userId: string,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { orderId: true },
    });
    if (!item) throw new NotFoundException(`Ítem ${orderItemId} no encontrado`);

    if (quantity === null) {
      await this.prisma.materialConsumption.updateMany({
        where: { orderItemId, supplyId },
        data: { source: MaterialConsumptionSource.AUTO },
      });
      await this.syncOrder(item.orderId, userId);
      return this.getOrderConsumption(item.orderId);
    }

    const alerts: LotLowAlert[] = [];
    await this.prisma.$transaction(async (tx) => {
      await lockOrderForUpdate(tx, item.orderId);
      const order = await tx.order.findUnique({
        where: { id: item.orderId },
        select: { orderNumber: true, status: true },
      });
      if (!order) throw new NotFoundException('OP no encontrada');
      if (order.status === OrderStatus.ANULADO) {
        throw new BadRequestException('La OP está anulada: su material ya se devolvió.');
      }
      const supply = await tx.supply.findUnique({
        where: { id: supplyId },
        select: { trackLots: true, name: true },
      });
      if (!supply?.trackLots) {
        throw new BadRequestException('El insumo no se controla por rollos/lotes.');
      }

      await tx.materialConsumption.updateMany({
        where: { orderItemId, supplyId },
        data: { source: MaterialConsumptionSource.MANUAL },
      });
      const rows = await tx.materialConsumption.findMany({
        where: { orderItemId, supplyId },
        select: this.rowSelect,
      });

      await this.lockSupplies(tx, [supplyId]);
      await this.adjustGroup(
        tx,
        {
          orderId: item.orderId,
          orderNumber: order.orderNumber,
          orderItemId,
          supplyId,
          source: MaterialConsumptionSource.MANUAL,
          userId,
        },
        rows,
        new Prisma.Decimal(quantity).toDecimalPlaces(4),
        alerts,
      );
    });

    this.notifyLowLots(alerts);
    return this.getOrderConsumption(item.orderId);
  }

  /**
   * Asigna a rollos los consumos que quedaron pendientes por falta de stock,
   * en orden de llegada y con el rollo en uso primero. Lo que no alcance sigue
   * pendiente. Cada consumo va en su propia transacción (respeta el orden de
   * bloqueo OP → insumo).
   */
  async assignPending(supplyId: string, userId: string) {
    const pendingRows = await this.prisma.materialConsumption.findMany({
      where: { supplyId, lotId: null },
      select: { id: true, orderId: true },
      orderBy: { createdAt: 'asc' },
    });

    let assigned = 0;
    const alerts: LotLowAlert[] = [];
    for (const { id, orderId } of pendingRows) {
      const done = await this.prisma.$transaction(async (tx) => {
        await lockOrderForUpdate(tx, orderId);
        await this.lockSupplies(tx, [supplyId]);
        const row = await tx.materialConsumption.findUnique({
          where: { id },
          select: { ...this.rowSelect, order: { select: { orderNumber: true } } },
        });
        if (!row || row.lotId !== null) return false;

        const allocated = await this.allocateFromLots(
          tx,
          {
            orderId,
            orderNumber: row.order.orderNumber,
            orderItemId: row.orderItemId,
            supplyId,
            source: row.source,
            userId,
          },
          new Prisma.Decimal(row.quantity),
          alerts,
        );
        if (allocated.isZero()) return false;

        const left = new Prisma.Decimal(row.quantity).sub(allocated);
        if (left.isZero()) {
          await tx.materialConsumption.delete({ where: { id } });
        } else {
          await tx.materialConsumption.update({ where: { id }, data: { quantity: left } });
        }
        return true;
      });
      if (done) assigned++;
    }

    this.notifyLowLots(alerts);
    const remaining = await this.prisma.materialConsumption.count({
      where: { supplyId, lotId: null },
    });
    return { assigned, remaining };
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  async getOrderConsumption(orderId: string) {
    const rows = await this.prisma.materialConsumption.findMany({
      where: { orderId },
      select: {
        id: true,
        orderItemId: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        source: true,
        lot: { select: { id: true, code: true } },
        supply: {
          select: { id: true, name: true, consumptionUnit: { select: { abbreviation: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toNumbers(r));
  }

  async getPending() {
    const rows = await this.prisma.materialConsumption.findMany({
      where: { lotId: null },
      select: {
        id: true,
        quantity: true,
        source: true,
        createdAt: true,
        supply: {
          select: { id: true, name: true, consumptionUnit: { select: { abbreviation: true } } },
        },
        order: {
          select: { id: true, orderNumber: true, client: { select: { name: true } } },
        },
        orderItem: { select: { id: true, description: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
  }

  async getLotConsumption(lotId: string) {
    const rows = await this.prisma.materialConsumption.findMany({
      where: { lotId },
      select: {
        id: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        source: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, status: true, client: { select: { name: true } } } },
        orderItem: { select: { id: true, description: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toNumbers(r));
  }

  // ---------------------------------------------------------------------------
  // Núcleo
  // ---------------------------------------------------------------------------

  private readonly rowSelect = {
    id: true,
    orderItemId: true,
    supplyId: true,
    lotId: true,
    quantity: true,
    source: true,
    createdAt: true,
  } as const;

  private async lockSupplies(tx: Tx, supplyIds: string[]) {
    for (const id of [...new Set(supplyIds)].sort()) {
      await this.lotsRepository.lockSupply(tx, id);
    }
  }

  /** Lleva el consumo del grupo (ítem × insumo) a `desired` moviendo solo la diferencia. */
  private async adjustGroup(
    tx: Tx,
    ctx: GroupContext,
    rows: ConsumptionRow[],
    desired: Prisma.Decimal,
    alerts: LotLowAlert[],
  ) {
    const current = rows.reduce((acc, r) => acc.add(r.quantity), ZERO);
    const delta = desired.sub(current);
    if (delta.isZero()) return;

    if (delta.greaterThan(0)) {
      const allocated = await this.allocateFromLots(tx, ctx, delta, alerts);
      const missing = delta.sub(allocated);
      if (missing.greaterThan(0)) await this.addPending(tx, ctx, missing);
      return;
    }

    await this.release(tx, ctx, rows, delta.neg());
  }

  /**
   * Toma `qty` de los lotes vigentes: el rollo en uso primero y luego por orden
   * de ingreso. Devuelve cuánto alcanzó a tomar.
   */
  private async allocateFromLots(
    tx: Tx,
    ctx: GroupContext,
    qty: Prisma.Decimal,
    alerts: LotLowAlert[],
  ): Promise<Prisma.Decimal> {
    const lots = await tx.supplyLot.findMany({
      where: { supplyId: ctx.supplyId, status: { in: ACTIVE_LOT_STATUSES }, remainingQuantity: { gt: 0 } },
      select: {
        id: true,
        code: true,
        status: true,
        remainingQuantity: true,
        lowStockQuantity: true,
        unitCost: true,
        supply: { select: { name: true } },
      },
      orderBy: [{ receivedAt: 'asc' }, { sequence: 'asc' }],
    });
    lots.sort((a, b) => Number(b.status === SupplyLotStatus.IN_USE) - Number(a.status === SupplyLotStatus.IN_USE));

    let left = qty;
    for (const lot of lots) {
      if (left.lessThanOrEqualTo(0)) break;
      const remaining = new Prisma.Decimal(lot.remainingQuantity);
      const take = Prisma.Decimal.min(remaining, left);
      left = left.sub(take);

      const row = await this.upsertRow(tx, ctx, lot.id, take, new Prisma.Decimal(lot.unitCost));
      const newRemaining = remaining.sub(take);
      const depleted = newRemaining.isZero();

      await tx.supplyLot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: newRemaining,
          ...(depleted && { status: SupplyLotStatus.DEPLETED, depletedAt: new Date() }),
        },
      });
      await this.moveStock(tx, ctx, {
        lotId: lot.id,
        consumptionId: row.id,
        type: InventoryMovementType.EXIT,
        quantity: take,
        unitCost: lot.unitCost,
        reason: `Consumo de ${ctx.orderNumber}`,
      });

      if (depleted && lot.status === SupplyLotStatus.IN_USE) {
        await this.lotsRepository.promoteNextLot(tx, ctx.supplyId);
      }
      const low = new Prisma.Decimal(lot.lowStockQuantity);
      if (!depleted && remaining.greaterThanOrEqualTo(low) && newRemaining.lessThan(low)) {
        alerts.push({ lotId: lot.id, code: lot.code, supplyName: lot.supply.name, remaining: newRemaining });
      }
    }
    return qty.sub(left);
  }

  /**
   * Devuelve `qty`: primero lo pendiente (no tocó stock), luego los lotes del
   * más reciente al más antiguo. Un lote que ya terminó (agotado, cerrado o
   * anulado) no recupera saldo: el material vuelve y sale de inmediato como
   * merma recuperada (decisión del cliente, §9.5 del plan).
   */
  private async release(tx: Tx, ctx: GroupContext, rows: ConsumptionRow[], qty: Prisma.Decimal) {
    const ordered = [...rows].sort((a, b) => {
      if ((a.lotId === null) !== (b.lotId === null)) return a.lotId === null ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    let left = qty;
    for (const row of ordered) {
      if (left.lessThanOrEqualTo(0)) break;
      const rowQty = new Prisma.Decimal(row.quantity);
      const give = Prisma.Decimal.min(rowQty, left);
      left = left.sub(give);

      const rest = rowQty.sub(give);
      if (rest.isZero()) {
        // Antes de borrar, el kardex deja de apuntar a la fila (FK SetNull).
        await tx.materialConsumption.delete({ where: { id: row.id } });
      } else {
        const lot = row.lotId
          ? await tx.supplyLot.findUnique({ where: { id: row.lotId }, select: { unitCost: true } })
          : null;
        await tx.materialConsumption.update({
          where: { id: row.id },
          data: {
            quantity: rest,
            ...(lot && { totalCost: rest.mul(lot.unitCost).toDecimalPlaces(2) }),
          },
        });
      }

      if (row.lotId === null) continue;

      const lot = await tx.supplyLot.findUniqueOrThrow({
        where: { id: row.lotId },
        select: { id: true, code: true, status: true, unitCost: true, remainingQuantity: true },
      });
      const consumptionId = rest.isZero() ? null : row.id;

      await this.moveStock(tx, ctx, {
        lotId: lot.id,
        consumptionId,
        type: InventoryMovementType.RETURN,
        quantity: give,
        unitCost: lot.unitCost,
        reason: `Devolución de ${ctx.orderNumber}`,
      });

      if (ACTIVE_LOT_STATUSES.includes(lot.status)) {
        await tx.supplyLot.update({
          where: { id: lot.id },
          data: { remainingQuantity: { increment: give } },
        });
      } else {
        // El rollo físico ya no existe: lo devuelto sale como merma recuperada.
        await this.moveStock(tx, ctx, {
          lotId: lot.id,
          consumptionId,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: give,
          unitCost: lot.unitCost,
          reason: `Merma recuperada: devolución de ${ctx.orderNumber} a un rollo ${lot.status === SupplyLotStatus.CLOSED ? 'cerrado' : 'terminado'}`,
        });
        await tx.supplyLot.update({
          where: { id: lot.id },
          data: { wasteQuantity: { increment: give } },
        });
      }
    }
  }

  private async addPending(tx: Tx, ctx: GroupContext, qty: Prisma.Decimal) {
    const existing = await tx.materialConsumption.findFirst({
      where: { orderId: ctx.orderId, orderItemId: ctx.orderItemId, supplyId: ctx.supplyId, lotId: null },
      select: { id: true },
    });
    if (existing) {
      await tx.materialConsumption.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    } else {
      await tx.materialConsumption.create({
        data: {
          orderId: ctx.orderId,
          orderItemId: ctx.orderItemId,
          supplyId: ctx.supplyId,
          lotId: null,
          quantity: qty,
          source: ctx.source,
          createdById: ctx.userId,
        },
      });
    }
  }

  private async upsertRow(
    tx: Tx,
    ctx: GroupContext,
    lotId: string,
    qty: Prisma.Decimal,
    unitCost: Prisma.Decimal,
  ) {
    const existing = await tx.materialConsumption.findFirst({
      where: { orderId: ctx.orderId, orderItemId: ctx.orderItemId, supplyId: ctx.supplyId, lotId },
      select: { id: true, quantity: true },
    });
    if (existing) {
      const quantity = new Prisma.Decimal(existing.quantity).add(qty);
      return tx.materialConsumption.update({
        where: { id: existing.id },
        data: { quantity, totalCost: quantity.mul(unitCost).toDecimalPlaces(2) },
        select: { id: true },
      });
    }
    return tx.materialConsumption.create({
      data: {
        orderId: ctx.orderId,
        orderItemId: ctx.orderItemId,
        supplyId: ctx.supplyId,
        lotId,
        quantity: qty,
        unitCost,
        totalCost: qty.mul(unitCost).toDecimalPlaces(2),
        source: ctx.source,
        createdById: ctx.userId,
      },
      select: { id: true },
    });
  }

  /** Cambia `currentStock` del insumo y deja el movimiento en el kardex. */
  private async moveStock(
    tx: Tx,
    ctx: GroupContext,
    m: {
      lotId: string;
      consumptionId: string | null;
      type: InventoryMovementType;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      reason: string;
    },
  ) {
    const increases = m.type === InventoryMovementType.RETURN;
    const updated = await tx.supply.update({
      where: { id: ctx.supplyId },
      data: { currentStock: increases ? { increment: m.quantity } : { decrement: m.quantity } },
      select: { currentStock: true },
    });
    const newStock = new Prisma.Decimal(updated.currentStock);
    await tx.inventoryMovement.create({
      data: {
        supplyId: ctx.supplyId,
        lotId: m.lotId,
        consumptionId: m.consumptionId,
        type: m.type,
        quantity: m.quantity,
        unitCost: m.unitCost,
        previousStock: increases ? newStock.sub(m.quantity) : newStock.add(m.quantity),
        newStock,
        referenceType: ORDER_CONSUMPTION_REFERENCE,
        referenceId: ctx.orderId,
        reason: m.reason,
        performedById: ctx.userId,
      },
    });
  }

  private notifyLowLots(alerts: LotLowAlert[]) {
    for (const a of alerts) {
      // Fuera de la transacción y sin bloquear: el consumo ya está firme.
      this.notificationsService
        .notifyUsersWithPermission('manage_supply_lots', {
          type: NotificationType.LOW_STOCK_ALERT,
          title: `Rollo bajo: ${a.code}`,
          message: `Al rollo ${a.code} (${a.supplyName}) le quedan ${Number(a.remaining).toLocaleString('es-CO', { maximumFractionDigits: 2 })}. Prepara el siguiente.`,
          relatedId: a.lotId,
          relatedType: 'SUPPLY_LOT',
        })
        .catch((err) => this.logger.error(`No se pudo avisar el rollo bajo ${a.code}`, err));
    }
  }

  private toNumbers<T extends { quantity: Prisma.Decimal; unitCost: Prisma.Decimal | null; totalCost: Prisma.Decimal | null }>(r: T) {
    return {
      ...r,
      quantity: Number(r.quantity),
      unitCost: r.unitCost === null ? null : Number(r.unitCost),
      totalCost: r.totalCost === null ? null : Number(r.totalCost),
    };
  }
}
