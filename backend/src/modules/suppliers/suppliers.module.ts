import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { LocationsModule } from '../locations/locations.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';

@Module({
  imports: [DatabaseModule, LocationsModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}
