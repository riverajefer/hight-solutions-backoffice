import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CreditBalanceService } from './credit-balance.service';

@Module({
  imports: [DatabaseModule],
  providers: [CreditBalanceService],
  exports: [CreditBalanceService],
})
export class CreditBalanceModule {}
