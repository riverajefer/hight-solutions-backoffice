import { SupplyLotsRepository } from './supply-lots.repository';
import { PrismaService } from '../../database/prisma.service';

describe('SupplyLotsRepository.findAll', () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const prisma = {
    supplyLot: { findMany, count, fields: { lowStockQuantity: 'low_stock_quantity' } },
  } as unknown as PrismaService;
  const repo = new SupplyLotsRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  const whereFor = async (view?: 'active' | 'low' | 'history' | 'all') => {
    await repo.findAll({ view } as never);
    return findMany.mock.calls[0][0].where;
  };

  it('vigentes: solo lotes de insumos activos', async () => {
    const where = await whereFor('active');
    expect(where.supply).toEqual({ isActive: true });
    expect(count.mock.calls[0][0].where.supply).toEqual({ isActive: true });
  });

  it('bajo inventario: solo lotes de insumos activos', async () => {
    expect((await whereFor('low')).supply).toEqual({ isActive: true });
  });

  it('por defecto es la vista de vigentes', async () => {
    expect((await whereFor(undefined)).supply).toEqual({ isActive: true });
  });

  it('histórico y todos incluyen los insumos desactivados', async () => {
    expect((await whereFor('history')).supply).toBeUndefined();
    jest.clearAllMocks();
    expect((await whereFor('all')).supply).toBeUndefined();
  });
});
