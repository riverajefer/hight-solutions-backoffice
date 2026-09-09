import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { StorageModule } from '../storage/storage.module';
import { OrdersModule } from '../orders/orders.module';
import { CreditBalanceModule } from '../credit-balance/credit-balance.module';
import { DtfController } from './dtf.controller';
import { DtfService } from './dtf.service';
import { DtfRepository } from './dtf.repository';

@Module({
  imports: [
    DatabaseModule,
    ConsecutivesModule,
    StorageModule,
    OrdersModule,
    CreditBalanceModule,
  ],
  controllers: [DtfController],
  providers: [DtfService, DtfRepository],
  exports: [DtfService],
})
export class DtfModule {}
