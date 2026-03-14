import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceScheduler } from './attendance.scheduler';

@Module({
  imports: [DatabaseModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, AttendanceScheduler],
  exports: [AttendanceService],
})
export class AttendanceModule {}
