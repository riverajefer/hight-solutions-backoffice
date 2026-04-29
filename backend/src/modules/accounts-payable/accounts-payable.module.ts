import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { StorageModule } from '../storage/storage.module';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableRepository } from './accounts-payable.repository';
import { AccountsPayableAuthRequestsModule } from '../accounts-payable-auth-requests/accounts-payable-auth-requests.module';

@Module({
  imports: [
    DatabaseModule,
    ConsecutivesModule,
    StorageModule,
    forwardRef(() => AccountsPayableAuthRequestsModule),
  ],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService, AccountsPayableRepository],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
