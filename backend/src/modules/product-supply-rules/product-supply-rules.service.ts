import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { ProductSupplyRulesRepository } from './product-supply-rules.repository';
import { ProductSupplyRuleInputDto } from './dto';

/**
 * Receta de un producto: qué insumos con rollos consume y cuánto por unidad
 * vendida. El motor de consumo (`MaterialConsumptionService`) la aplica.
 *
 * Reglas de edición, para no mover lo que ya pasó:
 * - Quitar un insumo lo **desactiva**; los consumos ya hechos se quedan.
 * - Reactivarlo (o crearlo) fija su vigencia en este momento: no alcanza a
 *   los ítems creados antes.
 * - Cambiar el factor solo vale para ítems nuevos (el factor queda congelado
 *   en cada consumo).
 */
@Injectable()
export class ProductSupplyRulesService {
  constructor(private readonly repository: ProductSupplyRulesRepository) {}

  async findByProduct(productId: string) {
    await this.assertProduct(productId);
    const rules = await this.repository.findByProduct(productId);
    return rules.map((r) => ({ ...r, factor: Number(r.factor) }));
  }

  async replace(productId: string, input: ProductSupplyRuleInputDto[]) {
    await this.assertProduct(productId);

    const ids = input.map((r) => r.supplyId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Un insumo aparece dos veces en la receta.');
    }
    const supplies = await this.repository.findSupplies(ids);
    for (const id of ids) {
      const supply = supplies.find((s) => s.id === id);
      if (!supply) throw new NotFoundException(`Insumo ${id} no encontrado`);
      if (!supply.trackLots || !supply.isActive) {
        throw new BadRequestException(
          `«${supply.name}» no se controla por rollos/lotes: actívalo en el insumo antes de usarlo en una receta.`,
        );
      }
    }

    await this.repository.transaction(async (tx) => {
      const current = await this.repository.findAllForProductTx(tx, productId);
      const now = new Date();

      for (const rule of input) {
        const factor = new Prisma.Decimal(rule.factor).toDecimalPlaces(4);
        const existing = current.find((c) => c.supplyId === rule.supplyId);
        if (!existing) {
          await tx.productSupplyRule.create({
            data: { productId, supplyId: rule.supplyId, factor, effectiveFrom: now },
          });
        } else if (!existing.isActive) {
          await tx.productSupplyRule.update({
            where: { id: existing.id },
            data: { factor, isActive: true, autoConsume: true, effectiveFrom: now },
          });
        } else if (!new Prisma.Decimal(existing.factor).equals(factor)) {
          await tx.productSupplyRule.update({ where: { id: existing.id }, data: { factor } });
        }
      }

      const removed = current.filter((c) => c.isActive && !ids.includes(c.supplyId)).map((c) => c.id);
      if (removed.length > 0) {
        await tx.productSupplyRule.updateMany({
          where: { id: { in: removed } },
          data: { isActive: false },
        });
      }
    });

    return this.findByProduct(productId);
  }

  private async assertProduct(productId: string) {
    const product = await this.repository.productExists(productId);
    if (!product) throw new NotFoundException(`Producto ${productId} no encontrado`);
  }
}
