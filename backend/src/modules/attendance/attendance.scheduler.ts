import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AttendanceService } from './attendance.service';
import { AttendanceSource } from '../../generated/prisma';
import { BUSINESS_TIMEZONE } from '../../common/utils/date-range.util';
import {
  OVERTIME_CAP_CRON,
  parseWorkdayEnd,
  workdayEndCron,
} from './attendance-schedule.util';

export const WORKDAY_END_JOB = 'attendance-workday-end';
export const OVERTIME_CAP_JOB = 'attendance-overtime-cap';

@Injectable()
export class AttendanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Registra los dos cierres automáticos, en hora Colombia:
   *
   * - **Cierre de jornada** (`ATTENDANCE_WORKDAY_END`, por defecto 19:00): cierra
   *   todo lo abierto. Quien hace horas extra vuelve a marcar entrada, y ese
   *   segundo registro es la hora extra.
   * - **Tope de horas extra** (23:59): cierra lo que se abrió después y nadie
   *   cerró, para que no quede abierto hasta el cierre del día siguiente.
   *
   * No van con `@Cron` porque la hora de cierre es configurable y el decorador
   * se evalúa al cargar la clase, antes de que ConfigModule lea el `.env`.
   *
   * Antes el cierre era `@Cron('0 59 23 * * *')` sin zona horaria: en Railway
   * (UTC) corría a las 6:59 p. m. de Colombia, y no había tope para las horas
   * extra.
   */
  onModuleInit() {
    const workdayEnd = parseWorkdayEnd(
      this.configService.get<string>('ATTENDANCE_WORKDAY_END'),
    );
    if (!workdayEnd.valid) {
      this.logger.warn(
        `[Asistencia] ATTENDANCE_WORKDAY_END no tiene formato HH:mm; se usa ${workdayEnd.label}.`,
      );
    }

    this.register(WORKDAY_END_JOB, workdayEndCron(workdayEnd), () =>
      this.handleEndOfDayClose(),
    );
    this.register(OVERTIME_CAP_JOB, OVERTIME_CAP_CRON, () => this.handleOvertimeCap());

    this.logger.log(
      `[Asistencia] Cierre de jornada a las ${workdayEnd.label} y tope de horas extra a las 23:59 (${BUSINESS_TIMEZONE}).`,
    );
  }

  private register(name: string, cronTime: string, onTick: () => Promise<void>) {
    const job = CronJob.from({
      cronTime,
      onTick,
      timeZone: BUSINESS_TIMEZONE,
      start: false,
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  /**
   * Cada 15 minutos: cierra registros de usuarios sin actividad en los últimos 60 min
   * (red de seguridad relajada; ver autoCloseInactiveRecords en el service)
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
   * Cierre de jornada (19:00 hora Colombia por defecto): cierra todos los
   * registros abiertos. Lo registra `onModuleInit`.
   */
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
   * Tope de horas extra (23:59 hora Colombia): cierra los registros que se
   * abrieron después del cierre de jornada y siguen abiertos. Lo registra
   * `onModuleInit`.
   */
  async handleOvertimeCap() {
    try {
      const count = await this.attendanceService.closeAllOpenRecords(AttendanceSource.SYSTEM);
      if (count > 0) {
        this.logger.log(`[Tope horas extra] Se cerraron ${count} registro(s) de horas extra abiertos.`);
      }
    } catch (error) {
      this.logger.error('[Tope horas extra] Error al cerrar registros abiertos', error);
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
