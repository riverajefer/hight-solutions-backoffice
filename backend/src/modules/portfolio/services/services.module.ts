import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
