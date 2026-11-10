import { Prisma, SupplyLotStatus } from '../../generated/prisma';
import {
  computeLotDisplayStatus,
  computeLowStockQuantity,
  resolveLotCosts,
} from './supply-lot-stock.util';

const D = (n: number) => new Prisma.Decimal(n);

describe('supply-lot-stock.util', () => {
  describe('computeLowStockQuantity', () => {
    it('usa 10 % por defecto', () => {
      expect(computeLowStockQuantity(D(100)).toNumber()).toBe(10);
    });
    it('respeta el porcentaje del insumo', () => {
      expect(computeLowStockQuantity(D(50), D(20)).toNumber()).toBe(10);
    });
  });

  describe('computeLotDisplayStatus', () => {
    const base = { status: SupplyLotStatus.AVAILABLE, lowStockQuantity: D(10) };
    it('disponible con saldo sobre el umbral (exactamente 10 m no alerta)', () => {
      expect(computeLotDisplayStatus({ ...base, remainingQuantity: D(10) })).toBe('AVAILABLE');
    });
    it('bajo inventario por debajo del umbral', () => {
      expect(computeLotDisplayStatus({ ...base, remainingQuantity: D(9.99) })).toBe('LOW');
    });
    it('agotado en cero aunque el estado guardado no lo diga', () => {
      expect(computeLotDisplayStatus({ ...base, remainingQuantity: D(0) })).toBe('DEPLETED');
    });
    it('respeta los estados terminales', () => {
      expect(
        computeLotDisplayStatus({ ...base, status: SupplyLotStatus.VOIDED, remainingQuantity: D(0) }),
      ).toBe('VOIDED');
      expect(
        computeLotDisplayStatus({ ...base, status: SupplyLotStatus.CLOSED, remainingQuantity: D(0) }),
      ).toBe('CLOSED');
    });
  });

  describe('resolveLotCosts', () => {
    it('calcula el total desde el costo por metro', () => {
      const r = resolveLotCosts(D(100), { unitCost: 100 });
      expect(r.totalCost.toNumber()).toBe(10000);
      expect(r.unitCost.toNumber()).toBe(100);
    });
    it('calcula el costo por metro desde el total', () => {
      const r = resolveLotCosts(D(30), { totalCost: 100000 });
      expect(r.unitCost.toNumber()).toBe(3333.3333);
      expect(r.totalCost.toNumber()).toBe(100000);
    });
    it('rechaza ambos o ninguno', () => {
      expect(() => resolveLotCosts(D(1), { unitCost: 1, totalCost: 1 })).toThrow();
      expect(() => resolveLotCosts(D(1), {})).toThrow();
    });
  });
});
