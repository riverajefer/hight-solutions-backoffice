import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductionAreasController } from './production-areas.controller';
import { ProductionAreasService } from './production-areas.service';
import { ProductionAreasRepository } from './production-areas.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductionAreasController],
  providers: [ProductionAreasService, ProductionAreasRepository],
  exports: [ProductionAreasService, ProductionAreasRepository],
})
export class ProductionAreasModule {}
