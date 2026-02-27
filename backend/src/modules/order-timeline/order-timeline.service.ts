import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EntityType } from './dto';

export interface OrderTreeNode {
  id: string;
  type: 'COT' | 'OP' | 'OT' | 'OG';
  number: string;
  status: string;
  clientName: string;
  total: number | null;
  detailPath: string;
  createdAt: string;
  /** ISO timestamp de cierre del nodo; solo presente en OT cuando su estado es terminal (COMPLETED/CANCELLED). */
  endedAt: string | null;
  /** Presente en COT y OP: nombre del usuario que creó el documento. */
  createdByName?: string | null;
  /** Solo presente en nodos COT: nombre del canal comercial asociado. */
  commercialChannelName?: string | null;
  /** Solo presente en nodos OP: saldo pendiente de pago (balance = total - paidAmount). */
  pendingBalance?: number | null;
  /** Solo presente en nodos OT: nombre del asesor que gestiona la orden de trabajo. */
  advisorName?: string | null;
  /** Solo presente en nodos OT: nombre del diseñador asignado. */
  designerName?: string | null;
}

export interface OrderTreeEdge {
  source: string;
  target: string;
}

export interface OrderTreeResponse {
  nodes: OrderTreeNode[];
  edges: OrderTreeEdge[];
  rootId: string;
  focusedId: string;
}

@Injectable()
export class OrderTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  private buildUserDisplayName(user: {
    firstName: string | null;
    lastName: string | null;
  }): string | null {
    const fullName = [user.firstName, user.lastName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ')
      .trim();

    return fullName || null;
  }

  async getOrderTree(
    entityId: string,
    entityType: EntityType,
  ): Promise<OrderTreeResponse> {
    // Step 1: Find the root Order by walking up from any starting point
    const orderId = await this.resolveOrderId(entityId, entityType);

    // Step 2: Load the full Order with all related documents
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        balance: true,
        createdAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
        client: { select: { name: true } },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
            client: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
            commercialChannel: { select: { name: true } },
          },
        },
        workOrders: {
          select: {
            id: true,
            workOrderNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            advisor: { select: { firstName: true, lastName: true } },
            designer: { select: { firstName: true, lastName: true } },
            order: {
              select: {
                total: true,
                client: { select: { name: true } },
              },
            },
            expenseOrders: {
              select: {
                id: true,
                ogNumber: true,
                status: true,
                createdAt: true,
                items: {
                  select: { total: true },
                },
                workOrder: {
                  select: {
                    order: {
                      select: {
                        client: { select: { name: true } },
                      },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    const nodes: OrderTreeNode[] = [];
    const edges: OrderTreeEdge[] = [];
    const clientName = order.client.name;

    const OT_TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

    // Add Quote node if exists
    if (order.quote) {
      nodes.push({
        id: order.quote.id,
        type: 'COT',
        number: order.quote.quoteNumber,
        status: order.quote.status,
        clientName: order.quote.client.name,
        total: order.quote.total ? Number(order.quote.total) : null,
        detailPath: `/quotes/${order.quote.id}`,
        createdAt: order.quote.createdAt.toISOString(),
        endedAt: null,
        createdByName: this.buildUserDisplayName(order.quote.createdBy),
        commercialChannelName: order.quote.commercialChannel?.name ?? null,
      });
      edges.push({ source: order.quote.id, target: order.id });
    }

    // Add Order node
    nodes.push({
      id: order.id,
      type: 'OP',
      number: order.orderNumber,
      status: order.status,
      clientName,
      total: order.total ? Number(order.total) : null,
      detailPath: `/orders/${order.id}`,
      createdAt: order.createdAt.toISOString(),
      endedAt: null,
      createdByName: this.buildUserDisplayName(order.createdBy),
      pendingBalance: order.balance != null ? Number(order.balance) : null,
    });

    // Add WorkOrder nodes and their ExpenseOrders
    for (const wo of order.workOrders) {
      nodes.push({
        id: wo.id,
        type: 'OT',
        number: wo.workOrderNumber,
        status: wo.status,
        clientName,
        total: null,
        detailPath: `/work-orders/${wo.id}`,
        createdAt: wo.createdAt.toISOString(),
        endedAt: OT_TERMINAL_STATUSES.includes(wo.status)
          ? wo.updatedAt.toISOString()
          : null,
        advisorName: this.buildUserDisplayName(wo.advisor),
        designerName: wo.designer
          ? this.buildUserDisplayName(wo.designer)
          : null,
      });
      edges.push({ source: order.id, target: wo.id });

      for (const eo of wo.expenseOrders) {
        const eoTotal = eo.items.reduce(
          (sum, item) => sum + Number(item.total),
          0,
        );
        nodes.push({
          id: eo.id,
          type: 'OG',
          number: eo.ogNumber,
          status: eo.status,
          clientName,
          total: eoTotal || null,
          detailPath: `/expense-orders/${eo.id}`,
          createdAt: eo.createdAt.toISOString(),
          endedAt: null,
        });
        edges.push({ source: wo.id, target: eo.id });
      }
    }

    // Determine rootId and focusedId
    const rootId = order.quote ? order.quote.id : order.id;
    const focusedId = this.resolveFocusedId(entityId, entityType, order);

    return { nodes, edges, rootId, focusedId };
  }

  /**
   * Search across all document types for the autocomplete/search dialog
   */
  async searchOrders(search: string, limit = 20) {
    const [quotes, orders, workOrders, expenseOrders] = await Promise.all([
      this.prisma.quote.findMany({
        where: {
          OR: [
            { quoteNumber: { contains: search, mode: 'insensitive' } },
            {
              client: { name: { contains: search, mode: 'insensitive' } },
            },
          ],
        },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          client: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            {
              client: { name: { contains: search, mode: 'insensitive' } },
            },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          client: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.findMany({
        where: {
          OR: [
            {
              workOrderNumber: { contains: search, mode: 'insensitive' },
            },
            {
              order: {
                client: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          workOrderNumber: true,
          status: true,
          order: { select: { client: { select: { name: true } } } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expenseOrder.findMany({
        where: {
          OR: [
            { ogNumber: { contains: search, mode: 'insensitive' } },
            {
              workOrder: {
                order: {
                  client: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          ogNumber: true,
          status: true,
          workOrder: {
            select: {
              order: { select: { client: { select: { name: true } } } },
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      quotes: quotes.map((q) => ({
        id: q.id,
        type: 'COT' as const,
        number: q.quoteNumber,
        status: q.status,
        clientName: q.client.name,
        entityType: EntityType.QUOTE,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        type: 'OP' as const,
        number: o.orderNumber,
        status: o.status,
        clientName: o.client.name,
        entityType: EntityType.ORDER,
      })),
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        type: 'OT' as const,
        number: wo.workOrderNumber,
        status: wo.status,
        clientName: wo.order.client.name,
        entityType: EntityType.WORK_ORDER,
      })),
      expenseOrders: expenseOrders.map((eo) => ({
        id: eo.id,
        type: 'OG' as const,
        number: eo.ogNumber,
        status: eo.status,
        clientName: eo.workOrder?.order?.client?.name || 'Sin cliente',
        entityType: EntityType.EXPENSE_ORDER,
      })),
    };
  }

  /**
   * Resolves any entity type to its parent Order ID by walking up the hierarchy
   */
  private async resolveOrderId(
    entityId: string,
    entityType: EntityType,
  ): Promise<string> {
    switch (entityType) {
      case EntityType.ORDER:
        return entityId;

      case EntityType.QUOTE: {
        const quote = await this.prisma.quote.findUnique({
          where: { id: entityId },
          select: { orderId: true },
        });
        if (!quote) {
          throw new NotFoundException(`Quote with id ${entityId} not found`);
        }
        if (!quote.orderId) {
          // Quote without an order — return a special response with just the quote
          throw new QuoteWithoutOrderException(entityId);
        }
        return quote.orderId;
      }

      case EntityType.WORK_ORDER: {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: entityId },
          select: { orderId: true },
        });
        if (!workOrder) {
          throw new NotFoundException(
            `Work order with id ${entityId} not found`,
          );
        }
        return workOrder.orderId;
      }

      case EntityType.EXPENSE_ORDER: {
        const expenseOrder = await this.prisma.expenseOrder.findUnique({
          where: { id: entityId },
          select: {
            workOrderId: true,
            workOrder: { select: { orderId: true } },
          },
        });
        if (!expenseOrder) {
          throw new NotFoundException(
            `Expense order with id ${entityId} not found`,
          );
        }
        if (!expenseOrder.workOrder) {
          // Expense order without a work order — orphan
          throw new ExpenseOrderWithoutWorkOrderException(entityId);
        }
        return expenseOrder.workOrder.orderId;
      }

      default:
        throw new NotFoundException(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Handle special case: Quote that hasn't been converted to an Order yet
   */
  async getQuoteOnlyTree(quoteId: string): Promise<OrderTreeResponse> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        total: true,
        createdAt: true,
        client: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        commercialChannel: { select: { name: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with id ${quoteId} not found`);
    }

    return {
      nodes: [
        {
          id: quote.id,
          type: 'COT',
          number: quote.quoteNumber,
          status: quote.status,
          clientName: quote.client.name,
          total: quote.total ? Number(quote.total) : null,
          detailPath: `/quotes/${quote.id}`,
          createdAt: quote.createdAt.toISOString(),
          endedAt: null,
          createdByName: this.buildUserDisplayName(quote.createdBy),
          commercialChannelName: quote.commercialChannel?.name ?? null,
        },
      ],
      edges: [],
      rootId: quote.id,
      focusedId: quote.id,
    };
  }

  /**
   * Handle special case: ExpenseOrder without a WorkOrder (orphan)
   */
  async getExpenseOrderOnlyTree(
    expenseOrderId: string,
  ): Promise<OrderTreeResponse> {
    const eo = await this.prisma.expenseOrder.findUnique({
      where: { id: expenseOrderId },
      select: {
        id: true,
        ogNumber: true,
        status: true,
        createdAt: true,
        items: { select: { total: true } },
      },
    });

    if (!eo) {
      throw new NotFoundException(
        `Expense order with id ${expenseOrderId} not found`,
      );
    }

    const total = eo.items.reduce(
      (sum, item) => sum + Number(item.total),
      0,
    );

    return {
      nodes: [
        {
          id: eo.id,
          type: 'OG',
          number: eo.ogNumber,
          status: eo.status,
          clientName: 'Sin cliente',
          total: total || null,
          detailPath: `/expense-orders/${eo.id}`,
          createdAt: eo.createdAt.toISOString(),
          endedAt: null,
        },
      ],
      edges: [],
      rootId: eo.id,
      focusedId: eo.id,
    };
  }

  private resolveFocusedId(
    entityId: string,
    entityType: EntityType,
    order: any,
  ): string {
    switch (entityType) {
      case EntityType.QUOTE:
        return order.quote?.id || order.id;
      case EntityType.ORDER:
        return order.id;
      case EntityType.WORK_ORDER:
        return entityId;
      case EntityType.EXPENSE_ORDER:
        return entityId;
      default:
        return order.id;
    }
  }
}

// Custom exceptions for special cases
class QuoteWithoutOrderException extends Error {
  constructor(public readonly quoteId: string) {
    super(`Quote ${quoteId} has no associated order`);
    this.name = 'QuoteWithoutOrderException';
  }
}

class ExpenseOrderWithoutWorkOrderException extends Error {
  constructor(public readonly expenseOrderId: string) {
    super(`Expense order ${expenseOrderId} has no associated work order`);
    this.name = 'ExpenseOrderWithoutWorkOrderException';
  }
}
