import { Module } from '@nestjs/common';
import { ProspectsService } from './prospects.service';
import { ProspectsController } from './prospects.controller';
import { ProspectsRepository } from './prospects.repository';

@Module({
  controllers: [ProspectsController],
  providers: [ProspectsService, ProspectsRepository],
  exports: [ProspectsService],
})
export class ProspectsModule {}
