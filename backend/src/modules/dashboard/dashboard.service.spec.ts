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

    // El rango se resuelve en hora Colombia, no en la del servidor. Antes usaba
    // `setHours(23,59,...)`, que trabaja en la zona del proceso: en Railway
    // (UTC) el rango terminaba a las 6:59 p. m. de Colombia y se comía la noche
    // del último día. Estas aserciones son en instantes absolutos justamente
    // para no depender de la zona donde corran los tests.
    it('usa el rango de fechas explícito, expandido a día completo en hora Colombia', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);

      await service.getFinancialDashboard({ dateFrom: '2026-01-01', dateTo: '2026-01-31' } as any);

      const [gte, lte] = repository.getTotalVentas.mock.calls[0];
      expect(gte).toEqual(new Date('2026-01-01T00:00:00.000-05:00'));
      expect(lte).toEqual(new Date('2026-01-31T23:59:59.999-05:00'));
    });

    // El caso que se perdía: una venta de las 8 de la noche del último día.
    it('incluye lo facturado la noche del último día del rango', async () => {
      repository.getTotalVentas.mockResolvedValue(0);
      repository.getTotalGastos.mockResolvedValue(0);

      await service.getFinancialDashboard({ dateFrom: '2026-01-01', dateTo: '2026-01-31' } as any);

      const [gte, lte] = repository.getTotalVentas.mock.calls[0];
      const ventaDeLaNoche = new Date('2026-01-31T20:00:00.000-05:00');

      expect(ventaDeLaNoche >= gte).toBe(true);
      expect(ventaDeLaNoche <= lte).toBe(true);
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
