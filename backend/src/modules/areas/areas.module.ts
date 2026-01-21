import { Module } from '@nestjs/common';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AreasController],
  providers: [AreasService, AreasRepository],
  exports: [AreasService, AreasRepository],
})
export class AreasModule {}
