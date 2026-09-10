import { Module } from '@nestjs/common';
import { PayrollDeductionsController } from './payroll-deductions.controller';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PayrollDeductionsController],
  providers: [PayrollDeductionsService],
  exports: [PayrollDeductionsService],
})
export class PayrollDeductionsModule {}
