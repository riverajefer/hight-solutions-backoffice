import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { StorageModule } from '../storage/storage.module';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableRepository } from './accounts-payable.repository';

@Module({
  imports: [DatabaseModule, ConsecutivesModule, StorageModule],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService, AccountsPayableRepository],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
