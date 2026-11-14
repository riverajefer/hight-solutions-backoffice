import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { ProductSupplyRulesService } from './product-supply-rules.service';

const D = (n: number) => new Prisma.Decimal(n);

describe('ProductSupplyRulesService', () => {
  const tx = {
    productSupplyRule: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };
  const repository = {
    productExists: jest.fn(),
    findByProduct: jest.fn(),
    findSupplies: jest.fn(),
    findAllForProductTx: jest.fn(),
    transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new ProductSupplyRulesService(repository as never);
  const supply = (id: string, trackLots = true) => ({ id, name: id, trackLots, isActive: true });

  beforeEach(() => {
    jest.clearAllMocks();
    repository.productExists.mockResolvedValue({ id: 'p1' });
    repository.findByProduct.mockResolvedValue([]);
    repository.findSupplies.mockResolvedValue([supply('cinta'), supply('papel'), supply('tela')]);
  });

  it('crea las reglas nuevas con vigencia desde ahora', async () => {
    repository.findAllForProductTx.mockResolvedValue([]);
    await service.replace('p1', [{ supplyId: 'cinta', factor: 0.9 }]);

    expect(tx.productSupplyRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p1', supplyId: 'cinta', factor: D(0.9), effectiveFrom: expect.any(Date) }),
    });
  });

  it('desactiva lo que no viene, cambia el factor sin tocar la vigencia y reactiva con vigencia nueva', async () => {
    repository.findAllForProductTx.mockResolvedValue([
      { id: 'r-cinta', supplyId: 'cinta', factor: D(0.9), isActive: true },
      { id: 'r-papel', supplyId: 'papel', factor: D(0.05), isActive: true },
      { id: 'r-tela', supplyId: 'tela', factor: D(1), isActive: false },
    ]);
    await service.replace('p1', [
      { supplyId: 'cinta', factor: 1 },
      { supplyId: 'tela', factor: 1 },
    ]);

    expect(tx.productSupplyRule.update).toHaveBeenCalledWith({ where: { id: 'r-cinta' }, data: { factor: D(1) } });
    expect(tx.productSupplyRule.update).toHaveBeenCalledWith({
      where: { id: 'r-tela' },
      data: expect.objectContaining({ isActive: true, effectiveFrom: expect.any(Date) }),
    });
    expect(tx.productSupplyRule.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['r-papel'] } },
      data: { isActive: false },
    });
  });

  it('no escribe nada si la regla no cambió', async () => {
    repository.findAllForProductTx.mockResolvedValue([{ id: 'r', supplyId: 'cinta', factor: D(0.9), isActive: true }]);
    await service.replace('p1', [{ supplyId: 'cinta', factor: 0.9 }]);

    expect(tx.productSupplyRule.update).not.toHaveBeenCalled();
    expect(tx.productSupplyRule.create).not.toHaveBeenCalled();
    expect(tx.productSupplyRule.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza insumos sin rollos, repetidos o inexistentes, y productos inexistentes', async () => {
    repository.findSupplies.mockResolvedValue([supply('tinta', false)]);
    await expect(service.replace('p1', [{ supplyId: 'tinta', factor: 1 }])).rejects.toThrow(BadRequestException);
    await expect(
      service.replace('p1', [{ supplyId: 'tinta', factor: 1 }, { supplyId: 'tinta', factor: 2 }]),
    ).rejects.toThrow(BadRequestException);
    await expect(service.replace('p1', [{ supplyId: 'x', factor: 1 }])).rejects.toThrow(NotFoundException);
    repository.productExists.mockResolvedValue(null);
    await expect(service.findByProduct('nope')).rejects.toThrow(NotFoundException);
  });
});
