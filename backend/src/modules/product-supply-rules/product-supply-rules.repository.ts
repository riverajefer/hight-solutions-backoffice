import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

type Tx = Prisma.TransactionClient;

export const PRODUCT_SUPPLY_RULE_SELECT = {
  id: true,
  supplyId: true,
  factor: true,
  isActive: true,
  effectiveFrom: true,
  updatedAt: true,
  supply: {
    select: {
      id: true,
      name: true,
      lotPrefix: true,
      trackLots: true,
      isActive: true,
      consumptionUnit: { select: { abbreviation: true } },
    },
  },
} as const satisfies Prisma.ProductSupplyRuleSelect;

@Injectable()
export class ProductSupplyRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProduct(productId: string, includeInactive = false) {
    return this.prisma.productSupplyRule.findMany({
      where: { productId, ...(includeInactive ? {} : { isActive: true }) },
      select: PRODUCT_SUPPLY_RULE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  productExists(productId: string) {
    return this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  }

  findSupplies(ids: string[]) {
    return this.prisma.supply.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, trackLots: true, isActive: true },
    });
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }

  findAllForProductTx(tx: Tx, productId: string) {
    return tx.productSupplyRule.findMany({
      where: { productId },
      select: { id: true, supplyId: true, factor: true, isActive: true },
    });
  }
}
