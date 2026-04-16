import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterRepository } from './cash-register.repository';

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService, CashRegisterRepository],
  exports: [CashRegisterService, CashRegisterRepository],
})
export class CashRegisterModule {}
