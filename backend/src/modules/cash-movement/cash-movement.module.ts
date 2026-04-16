import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { CashMovementController } from './cash-movement.controller';
import { CashMovementService } from './cash-movement.service';
import { CashMovementRepository } from './cash-movement.repository';

@Module({
  imports: [DatabaseModule, AuditLogsModule, ConsecutivesModule],
  controllers: [CashMovementController],
  providers: [CashMovementService, CashMovementRepository],
  exports: [CashMovementService],
})
export class CashMovementModule {}
