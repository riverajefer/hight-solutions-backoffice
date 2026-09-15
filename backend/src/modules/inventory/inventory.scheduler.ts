import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BUSINESS_TIMEZONE } from '../../common/utils/date-range.util';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryScheduler {
  private readonly logger = new Logger(InventoryScheduler.name);

  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Revisión diaria de stock bajo — 8:00 AM (hora Colombia) de lunes a sábado.
   * Notifica a usuarios con permiso 'manage_inventory' sobre insumos bajo el mínimo.
   *
   * Sin `timeZone` el cron usa la zona del servidor, que en Railway es UTC: la
   * alerta llegaba a las 3:00 AM.
   */
  @Cron('0 0 8 * * 1-6', { timeZone: BUSINESS_TIMEZONE })
  async handleDailyStockCheck() {
    try {
      const count = await this.inventoryService.checkAndNotifyAllLowStock();
      if (count > 0) {
        this.logger.log(`[Stock] Se enviaron ${count} notificación(es) de stock bajo.`);
      }
    } catch (error) {
      this.logger.error('[Stock] Error en revisión diaria de stock', error);
    }
  }
}
