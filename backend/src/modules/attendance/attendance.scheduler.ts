import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { AttendanceSource } from '../../generated/prisma';

@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Cada 15 minutos: cierra registros de usuarios sin actividad en los últimos 30 min
   */
  @Cron('0 */15 * * * *')
  async handleInactivityClose() {
    try {
      const count = await this.attendanceService.autoCloseInactiveRecords();
      if (count > 0) {
        this.logger.log(`[Inactividad] Se cerraron ${count} registro(s) por inactividad.`);
      }
    } catch (error) {
      this.logger.error('[Inactividad] Error al cerrar registros inactivos', error);
    }
  }

  /**
   * 11:59 PM cada día: cierra cualquier registro abierto como cierre de fin de día
   */
  @Cron('0 59 23 * * *')
  async handleEndOfDayClose() {
    try {
      const count = await this.attendanceService.closeAllOpenRecords(AttendanceSource.SYSTEM);
      if (count > 0) {
        this.logger.log(`[Fin de día] Se cerraron ${count} registro(s) abiertos.`);
      }
    } catch (error) {
      this.logger.error('[Fin de día] Error al cerrar registros abiertos', error);
    }
  }

  /**
   * 2 AM cada día: limpia heartbeats con más de 7 días de antigüedad
   */
  @Cron('0 0 2 * * *')
  async cleanOldHeartbeats() {
    try {
      const count = await this.attendanceService.cleanOldHeartbeats();
      if (count > 0) {
        this.logger.log(`[Limpieza] Se eliminaron ${count} heartbeat(s) antiguos.`);
      }
    } catch (error) {
      this.logger.error('[Limpieza] Error al limpiar heartbeats antiguos', error);
    }
  }
}
