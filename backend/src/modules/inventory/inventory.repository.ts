import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { FilterInventoryMovementsDto } from './dto';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly movementSelect = {
    id: true,
    type: true,
    quantity: true,
    unitCost: true,
    previousStock: true,
    newStock: true,
    referenceType: true,
    referenceId: true,
    reason: true,
    notes: true,
    createdAt: true,
    supply: {
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        consumptionUnit: { select: { id: true, name: true, abbreviation: true } },
      },
    },
    performedBy: {
      select: { id: true, firstName: true, lastName: true, username: true, email: true },
    },
  };

  async create(
    data: Prisma.InventoryMovementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.inventoryMovement.create({
      data,
      select: this.movementSelect,
    });
  }

  async findAll(filters: FilterInventoryMovementsDto) {
    const { supplyId, type, referenceType, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * Math.min(limit, 100);
    const take = Math.min(limit, 100);

    const where: Prisma.InventoryMovementWhereInput = {};
    if (supplyId) where.supplyId = supplyId;
    if (type) where.type = type;
    if (referenceType) where.referenceType = referenceType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        select: this.movementSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findById(id: string) {
    return this.prisma.inventoryMovement.findUnique({
      where: { id },
      select: this.movementSelect,
    });
  }

  async findBySupplyId(supplyId: string, limit = 50) {
    return this.prisma.inventoryMovement.findMany({
      where: { supplyId },
      select: this.movementSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLowStockSupplies() {
    return this.prisma.supply.findMany({
      where: {
        isActive: true,
        minimumStock: { gt: 0 },
        currentStock: { lt: this.prisma.supply.fields.minimumStock as any },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
        category: { select: { id: true, name: true } },
        consumptionUnit: { select: { id: true, name: true, abbreviation: true } },
      },
    });
  }

  async getLowStockSuppliesRaw() {
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        sku: string | null;
        current_stock: number;
        minimum_stock: number;
        purchase_price: number | null;
        category_name: string;
        unit_name: string;
        unit_abbreviation: string;
      }>
    >`
      SELECT
        s.id,
        s.name,
        s.sku,
        CAST(s.current_stock AS FLOAT) as current_stock,
        CAST(s.minimum_stock AS FLOAT) as minimum_stock,
        CAST(s.purchase_price AS FLOAT) as purchase_price,
        sc.name as category_name,
        uom.name as unit_name,
        uom.abbreviation as unit_name
      FROM supplies s
      JOIN supply_categories sc ON sc.id = s.category_id
      JOIN units_of_measure uom ON uom.id = s.consumption_unit_id
      WHERE s.is_active = true
        AND s.minimum_stock > 0
        AND s.current_stock < s.minimum_stock
      ORDER BY (s.minimum_stock - s.current_stock) DESC
    `;
  }

  async getInventoryValuation() {
    return this.prisma.$queryRaw<
      Array<{
        supply_id: string;
        supply_name: string;
        sku: string | null;
        current_stock: number;
        purchase_price: number | null;
        total_value: number;
        category_name: string;
        unit_name: string;
      }>
    >`
      SELECT
        s.id as supply_id,
        s.name as supply_name,
        s.sku,
        CAST(s.current_stock AS FLOAT) as current_stock,
        CAST(s.purchase_price AS FLOAT) as purchase_price,
        CAST(COALESCE(s.current_stock * s.purchase_price, 0) AS FLOAT) as total_value,
        sc.name as category_name,
        uom.name as unit_name
      FROM supplies s
      JOIN supply_categories sc ON sc.id = s.category_id
      JOIN units_of_measure uom ON uom.id = s.consumption_unit_id
      WHERE s.is_active = true
      ORDER BY total_value DESC
    `;
  }
}
