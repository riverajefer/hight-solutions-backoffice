import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesService } from './consecutives.service';
import { ConsecutivesRepository } from './consecutives.repository';

@Module({
  imports: [DatabaseModule],
  providers: [ConsecutivesService, ConsecutivesRepository],
  exports: [ConsecutivesService], // Solo exportar service, no repository
})
export class ConsecutivesModule {}
