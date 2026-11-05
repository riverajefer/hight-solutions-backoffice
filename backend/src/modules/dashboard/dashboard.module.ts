import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import { CommercialDashboardService } from './commercial-dashboard.service';
import { CommercialDashboardRepository } from './commercial-dashboard.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardRepository,
    CommercialDashboardService,
    CommercialDashboardRepository,
  ],
})
export class DashboardModule {}
