import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrderTimelineController } from './order-timeline.controller';
import { OrderTimelineService } from './order-timeline.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OrderTimelineController],
  providers: [OrderTimelineService],
})
export class OrderTimelineModule {}
