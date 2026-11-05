import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommercialDashboardService } from './commercial-dashboard.service';
import { CommercialDashboardRepository } from './commercial-dashboard.repository';

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const quoteGroup = (createdById: string, status: string, count: number, total: number) => ({
  createdById,
  status,
  _count: { _all: count },
  _sum: { total },
});

const orderGroup = (
  createdById: string,
  status: string,
  count: number,
  total: number,
  balance: number,
  reversedAmount = 0,
) => ({
  createdById,
  status,
  _count: { _all: count },
  _sum: { total, reversedAmount, balance },
});

describe('CommercialDashboardService', () => {
  let service: CommercialDashboardService;
  let repository: Record<string, jest.Mock>;

  beforeEach(async () => {
    repository = {
      canReadAllAdvisors: jest.fn().mockResolvedValue(true),
      groupQuotes: jest.fn().mockResolvedValue([]),
      groupOrders: jest.fn().mockResolvedValue([]),
      groupCommissionable: jest.fn().mockResolvedValue([]),
      findGoals: jest.fn().mockResolvedValue([]),
      portfolioAging: jest.fn().mockResolvedValue([]),
      newClients: jest.fn().mockResolvedValue([]),
      topDebtors: jest.fn().mockResolvedValue([]),
      findUsers: jest.fn().mockResolvedValue([
        { id: ME, firstName: 'Ana', lastName: 'Pérez', username: 'ana' },
        { id: OTHER, firstName: 'Luz', lastName: null, username: 'luz' },
      ]),
      findAdvisors: jest.fn().mockResolvedValue([]),
      monthlyQuoted: jest.fn().mockResolvedValue([]),
      monthlySold: jest.fn().mockResolvedValue([]),
      monthlyCollected: jest.fn().mockResolvedValue([]),
      findGoalsSince: jest.fn().mockResolvedValue([]),
      monthlyByClientType: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialDashboardService,
        { provide: CommercialDashboardRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(CommercialDashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('alcance', () => {
    it('sin permiso de ver a todas, acota a la asesora que consulta', async () => {
      repository.canReadAllAdvisors.mockResolvedValue(false);

      const result = await service.getCommercialDashboard({}, ME);

      expect(repository.groupOrders).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), ME);
      expect(repository.portfolioAging).toHaveBeenCalledWith(ME);
      expect(repository.findAdvisors).not.toHaveBeenCalled();
      expect(result.scopedToOwn).toBe(true);
      expect(result.advisorRanking).toEqual([]);
    });

    it('rechaza pedir otra asesora sin permiso, en lugar de devolver las cifras propias', async () => {
      repository.canReadAllAdvisors.mockResolvedValue(false);

      await expect(
        service.getCommercialDashboard({ advisorId: OTHER }, ME),
      ).rejects.toThrow(ForbiddenException);
    });

    it('con permiso y sin filtro, ve a todo el equipo', async () => {
      await service.getCommercialDashboard({}, ME);

      expect(repository.groupOrders).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), undefined);
    });
  });

  describe('KPI', () => {
    it('la conversión se mide sobre las cotizaciones enviadas, no sobre los borradores', async () => {
      repository.groupQuotes.mockResolvedValue([
        quoteGroup(ME, 'DRAFT', 2, 100),
        quoteGroup(ME, 'SENT', 4, 400),
        quoteGroup(ME, 'CONVERTED', 3, 300),
        quoteGroup(ME, 'ACCEPTED', 1, 100),
        quoteGroup(ME, 'REJECTED', 2, 200),
      ]);

      const { kpis, quoteFunnel } = await service.getCommercialDashboard({}, ME);

      expect(kpis.quotesCount).toBe(12);
      expect(kpis.quotesSent).toBe(10);
      expect(kpis.quotesWon).toBe(4);
      expect(kpis.conversionRate).toBeCloseTo(0.4);
      expect(quoteFunnel.openAmount).toBe(400);
    });

    it('la venta excluye borradores y devueltas, y descuenta lo revertido', async () => {
      repository.groupOrders.mockResolvedValue([
        orderGroup(ME, 'DELIVERED', 2, 1000, 0, 100),
        orderGroup(ME, 'READY', 1, 500, 200),
        orderGroup(ME, 'DRAFT', 1, 300, 300),
        orderGroup(ME, 'RETURNED', 1, 50, 0, 50),
      ]);

      const { kpis, salesByStatus } = await service.getCommercialDashboard({}, ME);

      expect(kpis.salesAmount).toBe(1400); // (1000 - 100) + 500
      expect(kpis.salesOrders).toBe(3);
      expect(kpis.averageTicket).toBeCloseTo(1400 / 3);

      const ready = salesByStatus.find((s) => s.key === 'READY')!;
      expect(ready.amount).toBe(500);
      expect(ready.collected).toBe(300);
      expect(salesByStatus.find((s) => s.key === 'DRAFT')!.amount).toBe(300);
    });

    it('un saldo a favor no hace que lo cobrado supere la venta', async () => {
      repository.groupOrders.mockResolvedValue([orderGroup(ME, 'DELIVERED', 1, 1000, -200)]);

      const { salesByStatus } = await service.getCommercialDashboard({}, ME);

      expect(salesByStatus.find((s) => s.key === 'DELIVERED')!.collected).toBe(1000);
    });
  });

  it('arma los cuatro tramos de cartera aunque alguno esté vacío', async () => {
    repository.portfolioAging.mockResolvedValue([
      { advisorId: ME, bucket: '0-30', orders: 2, balance: 300 },
      { advisorId: OTHER, bucket: '90+', orders: 1, balance: 700 },
    ]);

    const { kpis, portfolioAging } = await service.getCommercialDashboard({}, ME);

    expect(portfolioAging.map((b) => b.key)).toEqual(['0-30', '31-60', '61-90', '90+']);
    expect(portfolioAging[1].balance).toBe(0);
    expect(kpis.portfolioTotal).toBe(1000);
    expect(kpis.portfolioOrders).toBe(3);
  });

  describe('meta', () => {
    it('toma el mes en que termina el período', async () => {
      await service.getCommercialDashboard({ dateFrom: '2026-09-15', dateTo: '2026-10-10' }, ME);

      expect(repository.findGoals).toHaveBeenCalledWith(10, 2026, undefined);
    });

    it('no pasa del mes en curso aunque el período termine en el futuro', async () => {
      jest.useFakeTimers({ now: new Date('2026-11-04T15:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
      try {
        await service.getCommercialDashboard({ dateFrom: '2026-01-01', dateTo: '2026-12-31' }, ME);
        expect(repository.findGoals).toHaveBeenCalledWith(11, 2026, undefined);
      } finally {
        jest.useRealTimers();
      }
    });

    it('el avance del equipo solo suma a quien tiene meta cargada', async () => {
      repository.findGoals.mockResolvedValue([{ advisorId: ME, targetAmount: 1000 }]);
      repository.groupCommissionable.mockResolvedValue([
        { createdById: ME, _sum: { subtotal: 700, discountAmount: 100, reversedNetAmount: 0 } },
        { createdById: OTHER, _sum: { subtotal: 5000, discountAmount: 0, reversedNetAmount: 0 } },
      ]);

      const { goal } = await service.getCommercialDashboard({}, ME);

      expect(goal.hasGoal).toBe(true);
      expect(goal.target).toBe(1000);
      expect(goal.achieved).toBe(600);
      expect(goal.remaining).toBe(400);
    });

    it('sin metas cargadas lo dice, en lugar de mostrar 0 %', async () => {
      const { goal } = await service.getCommercialDashboard({}, ME);

      expect(goal.hasGoal).toBe(false);
    });
  });

  describe('evolución mensual', () => {
    it('arma los últimos 12 meses terminando en el mes en curso y quita los vacíos del principio', async () => {
      repository.monthlySold.mockResolvedValue([
        { month: '2026-06', amount: 100 },
        { month: '2026-09', amount: 300 },
      ]);
      repository.monthlyCollected.mockResolvedValue([{ month: '2026-11', amount: 50 }]);

      const trend = await service.getMonthlyTrend('2026-11-05');

      expect(trend.map((t) => t.month)).toEqual([
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
      ]);
      // Un mes sin ventas en el medio se deja en cero.
      expect(trend[1]).toMatchObject({ sold: 0, quoted: 0, collected: 0 });
      expect(trend[trend.length - 1]).toMatchObject({ collected: 50, inProgress: true });
      expect(trend.filter((t) => t.inProgress)).toHaveLength(1);
      expect(repository.monthlySold).toHaveBeenCalledWith(expect.any(Date), undefined);
    });

    it('cruza el año al contar los 12 meses', async () => {
      repository.monthlyQuoted.mockResolvedValue([{ month: '2025-03', amount: 10 }]);

      const trend = await service.getMonthlyTrend('2026-02-10');

      expect(trend[0].month).toBe('2025-03');
      expect(trend).toHaveLength(12);
      expect(repository.findGoalsSince).toHaveBeenCalledWith(2025, 3, undefined);
    });

    it('suma las metas del mes y deja null donde no hay meta, para que la línea se corte', async () => {
      repository.monthlySold.mockResolvedValue([{ month: '2026-06', amount: 100 }]);
      repository.findGoalsSince.mockResolvedValue([
        { year: 2026, month: 7, targetAmount: 1000 },
        { year: 2026, month: 7, targetAmount: 500 },
      ]);

      const trend = await service.getMonthlyTrend('2026-08-01');

      expect(trend.find((t) => t.month === '2026-06')!.goal).toBeNull();
      expect(trend.find((t) => t.month === '2026-07')!.goal).toBe(1500);
    });

    it('agrega la venta por tipo de cliente y deja en cero los meses sin datos', async () => {
      repository.monthlySold.mockResolvedValue([
        { month: '2026-09', amount: 1000 },
        { month: '2026-10', amount: 400 },
      ]);
      repository.monthlyByClientType.mockResolvedValue([
        { month: '2026-09', newAmount: 300, recurringAmount: 700, newClients: 2, recurringClients: 5 },
      ]);

      const trend = await service.getMonthlyTrend('2026-10-15');

      expect(trend.find((t) => t.month === '2026-09')).toMatchObject({
        newClientSales: 300,
        recurringClientSales: 700,
        newClients: 2,
        recurringClients: 5,
      });
      expect(trend.find((t) => t.month === '2026-10')).toMatchObject({
        newClientSales: 0,
        recurringClientSales: 0,
        newClients: 0,
        recurringClients: 0,
      });
      expect(repository.monthlyByClientType).toHaveBeenCalledWith(expect.any(Date), undefined);
    });

    it('sin datos devuelve solo el mes en curso', async () => {
      const trend = await service.getMonthlyTrend('2026-11-05');

      expect(trend).toHaveLength(1);
      expect(trend[0]).toMatchObject({ month: '2026-11', inProgress: true });
    });

    it('respeta la asesora del tablero', async () => {
      repository.canReadAllAdvisors.mockResolvedValue(false);

      await service.getCommercialDashboard({}, ME);

      expect(repository.monthlyCollected).toHaveBeenCalledWith(expect.any(Date), ME);
      expect(repository.findGoalsSince).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), ME);
    });
  });

  it('el ranking ordena por venta y deja fuera a quien no vendió ni cotizó en el período', async () => {
    repository.groupOrders.mockResolvedValue([
      orderGroup(ME, 'DELIVERED', 1, 100, 0),
      orderGroup(OTHER, 'DELIVERED', 1, 900, 0),
    ]);
    repository.portfolioAging.mockResolvedValue([
      { advisorId: 'old-advisor', bucket: '90+', orders: 1, balance: 50 },
    ]);

    const { advisorRanking } = await service.getCommercialDashboard({}, ME);

    expect(advisorRanking.map((r) => r.advisorName)).toEqual(['Luz', 'Ana Pérez']);
  });
});
