import { Test, TestingModule } from '@nestjs/testing';
import { InventoryScheduler } from './inventory.scheduler';
import { InventoryService } from './inventory.service';
import { Logger } from '@nestjs/common';

describe('InventoryScheduler', () => {
  let scheduler: InventoryScheduler;
  let service: jest.Mocked<InventoryService>;

  const mockService = {
    checkAndNotifyAllLowStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryScheduler,
        { provide: InventoryService, useValue: mockService },
      ],
    }).compile();

    scheduler = module.get<InventoryScheduler>(InventoryScheduler);
    service = module.get<InventoryService>(InventoryService) as jest.Mocked<InventoryService>;

    // Silenciar el logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('handleDailyStockCheck', () => {
    it('should call checkAndNotifyAllLowStock and log if count > 0', async () => {
      mockService.checkAndNotifyAllLowStock.mockResolvedValue(5);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await scheduler.handleDailyStockCheck();

      expect(service.checkAndNotifyAllLowStock).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Se enviaron 5 notificación'));
    });

    it('should call checkAndNotifyAllLowStock and not log if count === 0', async () => {
      mockService.checkAndNotifyAllLowStock.mockResolvedValue(0);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await scheduler.handleDailyStockCheck();

      expect(service.checkAndNotifyAllLowStock).toHaveBeenCalled();
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should log error if service throws', async () => {
      mockService.checkAndNotifyAllLowStock.mockRejectedValue(new Error('test err'));
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      await scheduler.handleDailyStockCheck();

      expect(service.checkAndNotifyAllLowStock).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Stock] Error en revisión diaria de stock',
        expect.any(Error)
      );
    });
  });
});
