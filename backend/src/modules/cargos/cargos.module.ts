import { Module } from '@nestjs/common';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';
import { CargosRepository } from './cargos.repository';
import { ProductionAreasModule } from '../production-areas/production-areas.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, ProductionAreasModule],
  controllers: [CargosController],
  providers: [CargosService, CargosRepository],
  exports: [CargosService, CargosRepository],
})
export class CargosModule {}
