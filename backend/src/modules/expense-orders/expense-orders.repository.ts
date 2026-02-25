import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExpenseOrderStatus } from '../../generated/prisma';
import { FilterExpenseOrdersDto } from './dto';

@Injectable()
export class ExpenseOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectFields = {
    id: true,
    ogNumber: true,
    status: true,
    observations: true,
    areaOrMachine: true,
    createdAt: true,
    updatedAt: true,
    expenseType: {
      select: { id: true, name: true },
    },
    expenseSubcategory: {
      select: { id: true, name: true },
    },
    workOrder: {
      select: {
        id: true,
        workOrderNumber: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    },
    authorizedTo: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    responsible: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    createdBy: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    items: {
      select: {
        id: true,
        quantity: true,
        name: true,
        description: true,
        unitPrice: true,
        total: true,
        paymentMethod: true,
        receiptFileId: true,
        sortOrder: true,
        supplier: {
          select: { id: true, name: true, email: true },
        },
        productionAreas: {
          select: {
            productionArea: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  async findAll(filters: FilterExpenseOrdersDto) {
    const { status, workOrderId, expenseTypeId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (workOrderId) where.workOrderId = workOrderId;
    if (expenseTypeId) where.expenseTypeId = expenseTypeId;

    if (search) {
      where.OR = [
        { ogNumber: { contains: search, mode: 'insensitive' } },
        { authorizedTo: { firstName: { contains: search, mode: 'insensitive' } } },
        { authorizedTo: { lastName: { contains: search, mode: 'insensitive' } } },
        { createdBy: { firstName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.expenseOrder.findMany({
        where,
        select: this.selectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expenseOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return this.prisma.expenseOrder.findUnique({
      where: { id },
      select: this.selectFields,
    });
  }

  async create(data: {
    ogNumber: string;
    expenseTypeId: string;
    expenseSubcategoryId: string;
    workOrderId?: string;
    authorizedToId: string;
    responsibleId?: string;
    observations?: string;
    areaOrMachine?: string;
    status: ExpenseOrderStatus;
    createdById: string;
    items: Array<{
      quantity: number;
      name: string;
      description?: string;
      supplierId?: string;
      unitPrice: number;
      total: number;
      paymentMethod: string;
      receiptFileId?: string;
      productionAreaIds?: string[];
      sortOrder: number;
    }>;
  }) {
    const { items, ...orderData } = data;

    return this.prisma.expenseOrder.create({
      data: {
        ...orderData,
        items: {
          create: items.map((item) => ({
            quantity: item.quantity,
            name: item.name,
            description: item.description,
            supplierId: item.supplierId,
            unitPrice: item.unitPrice,
            total: item.total,
            paymentMethod: item.paymentMethod as any,
            receiptFileId: item.receiptFileId,
            sortOrder: item.sortOrder,
            productionAreas: item.productionAreaIds?.length
              ? {
                  create: item.productionAreaIds.map((productionAreaId) => ({
                    productionAreaId,
                  })),
                }
              : undefined,
          })),
        },
      },
      select: this.selectFields,
    });
  }

  async update(
    id: string,
    data: {
      expenseTypeId?: string;
      expenseSubcategoryId?: string;
      workOrderId?: string | null;
      authorizedToId?: string;
      responsibleId?: string | null;
      observations?: string;
      areaOrMachine?: string;
    },
  ) {
    return this.prisma.expenseOrder.update({
      where: { id },
      data,
      select: this.selectFields,
    });
  }

  async replaceItems(
    expenseOrderId: string,
    items: Array<{
      quantity: number;
      name: string;
      description?: string;
      supplierId?: string;
      unitPrice: number;
      total: number;
      paymentMethod: string;
      receiptFileId?: string;
      productionAreaIds?: string[];
      sortOrder: number;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Delete existing items (cascade will remove productionAreas)
      await tx.expenseOrderItem.deleteMany({ where: { expenseOrderId } });

      // Create new items
      await tx.expenseOrderItem.createMany({
        data: items.map((item) => ({
          expenseOrderId,
          quantity: item.quantity,
          name: item.name,
          description: item.description,
          supplierId: item.supplierId,
          unitPrice: item.unitPrice,
          total: item.total,
          paymentMethod: item.paymentMethod as any,
          receiptFileId: item.receiptFileId,
          sortOrder: item.sortOrder,
        })),
      });

      // Create production area relations
      const createdItems = await tx.expenseOrderItem.findMany({
        where: { expenseOrderId },
        orderBy: { sortOrder: 'asc' },
      });

      for (let i = 0; i < createdItems.length; i++) {
        const areaIds = items[i]?.productionAreaIds;
        if (areaIds?.length) {
          await tx.expenseOrderItemProductionArea.createMany({
            data: areaIds.map((productionAreaId) => ({
              expenseOrderItemId: createdItems[i].id,
              productionAreaId,
            })),
          });
        }
      }
    });
  }

  async addItem(
    expenseOrderId: string,
    item: {
      quantity: number;
      name: string;
      description?: string;
      supplierId?: string;
      unitPrice: number;
      total: number;
      paymentMethod: string;
      receiptFileId?: string;
      productionAreaIds?: string[];
      sortOrder: number;
    },
  ) {
    const created = await this.prisma.expenseOrderItem.create({
      data: {
        expenseOrderId,
        quantity: item.quantity,
        name: item.name,
        description: item.description,
        supplierId: item.supplierId,
        unitPrice: item.unitPrice,
        total: item.total,
        paymentMethod: item.paymentMethod as any,
        receiptFileId: item.receiptFileId,
        sortOrder: item.sortOrder,
        productionAreas: item.productionAreaIds?.length
          ? {
              create: item.productionAreaIds.map((productionAreaId) => ({
                productionAreaId,
              })),
            }
          : undefined,
      },
    });

    return created;
  }

  async updateStatus(id: string, status: ExpenseOrderStatus) {
    return this.prisma.expenseOrder.update({
      where: { id },
      data: { status },
      select: this.selectFields,
    });
  }

  async delete(id: string) {
    return this.prisma.expenseOrder.delete({ where: { id } });
  }
}
