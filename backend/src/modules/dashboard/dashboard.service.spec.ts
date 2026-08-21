import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';

describe('DashboardService', () => {
  let service: DashboardService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      getTotalVentas: jest.fn(),
      getTotalGastos: jest.fn(),
      getCuentasPorPagar: jest.fn().mockResolvedValue(0),
      getCuentasPorCobrar: jest.fn().mockResolvedValue(0),
      getMonthlyData: jest.fn().mockResolvedValue([]),
      getIndicators: jest.fn().mockResolvedValue({
        clients: 0,
        products: 0,
        suppliers: 0,
        orders: 0,
        workOrders: 0,
        expenseOrders: 0,
      }),
      getRecentOrders: jest.fn().mockResolvedValue([]),
      getPendingOrders: jest.fn().mockResolvedValue([]),
      getTopClients: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getFinancialDashboard', () => {
    it('calcula la utilidad como ventas menos gastos', async () => {
      repository.getTotalVentas.mockResolvedValueOnce(500000).mockResolvedValueOnce(400000); // actual, prev
      repository.getTotalGastos.mockResolvedValueOnce(200000).mockResolvedValueOnce(150000);

      const result = await service.getFinancialDashboard({} as any);

      expect(result.summary.totalVentas).toBe(500000);
      expect(result.summary.utilidad).toBe(300000); // 500000 - 200000
      expect(result.summary.utilidadPrev).toBe(250000); // 400000 - 150000
    });

    it('mapea los indicadores a las claves del dashboard', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);
      repository.getIndicators.mockResolvedValue({
        clients: 12,
        products: 34,
        suppliers: 5,
        orders: 7,
        workOrders: 8,
        expenseOrders: 9,
      });

      const result = await service.getFinancialDashboard({} as any);

      expect(result.indicators).toEqual({
        totalClients: 12,
        totalProducts: 34,
        totalSuppliers: 5,
        totalOP: 7,
        totalOT: 8,
        totalOG: 9,
      });
    });

    it('agrega la utilidad mensual a cada fila de monthlyData', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);
      repository.getMonthlyData.mockResolvedValue([
        { mes: 'Ene', ventas: 100, gastos: 40 },
        { mes: 'Feb', ventas: 200, gastos: 250 },
      ]);

      const result = await service.getFinancialDashboard({} as any);

      expect(result.monthlyData[0].utilidad).toBe(60);
      expect(result.monthlyData[1].utilidad).toBe(-50);
    });

    it('usa el rango de fechas explícito cuando se proveen dateFrom y dateTo', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);

      await service.getFinancialDashboard({ dateFrom: '2026-01-01', dateTo: '2026-01-31' } as any);

      const [gte, lte] = repository.getTotalVentas.mock.calls[0];
      expect(gte).toEqual(new Date('2026-01-01'));
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);
    });

    it('usa el mes actual por defecto cuando no hay rango', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);

      await service.getFinancialDashboard({} as any);

      const [gte] = repository.getTotalVentas.mock.calls[0];
      const now = new Date();
      expect(gte.getMonth()).toBe(now.getMonth());
      expect(gte.getDate()).toBe(1);
      // El periodo previo se calcula por separado (segunda llamada con prevGte/prevLte)
      expect(repository.getTotalVentas).toHaveBeenCalledTimes(2);
    });
  });
});
