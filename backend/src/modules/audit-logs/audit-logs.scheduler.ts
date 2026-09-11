import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BUSINESS_TIMEZONE } from '../../common/utils/date-range.util';
import { AUDIT_RETENTION_MONTHS, AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditLogsScheduler {
  private readonly logger = new Logger(AuditLogsScheduler.name);

  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * 3:30 AM (hora Colombia) cada día: borra los registros de auditoría
   * operativos que ya pasaron el plazo de retención.
   *
   * Con réplicas corre una vez por réplica; el borrado es idempotente.
   */
  @Cron('0 30 3 * * *', { timeZone: BUSINESS_TIMEZONE })
  async purgeExpiredAuditLogs() {
    try {
      const count = await this.auditLogsService.purgeExpiredLogs();
      if (count > 0) {
        this.logger.log(
          `[Retención] Se eliminaron ${count} registro(s) de auditoría con más de ${AUDIT_RETENTION_MONTHS} meses.`,
        );
      }
    } catch (error) {
      this.logger.error('[Retención] Error al purgar registros de auditoría', error);
    }
  }
}
