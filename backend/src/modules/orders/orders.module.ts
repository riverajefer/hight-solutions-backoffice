import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { OrderEditRequestsModule } from '../order-edit-requests/order-edit-requests.module';
import { OrderStatusChangeRequestsModule } from '../order-status-change-requests/order-status-change-requests.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../storage/storage.module';
import { AdvancePaymentApprovalsModule } from '../advance-payment-approvals/advance-payment-approvals.module';
import { DiscountApprovalsModule } from '../discount-approvals/discount-approvals.module';
import { ClientOwnershipAuthRequestsModule } from '../client-ownership-auth-requests/client-ownership-auth-requests.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { CanEditOrderGuard } from '../../common/guards/can-edit-order.guard';

@Module({
  imports: [DatabaseModule, ConsecutivesModule, OrderEditRequestsModule, OrderStatusChangeRequestsModule, AuditLogsModule, StorageModule, AdvancePaymentApprovalsModule, DiscountApprovalsModule, ClientOwnershipAuthRequestsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, CanEditOrderGuard],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
