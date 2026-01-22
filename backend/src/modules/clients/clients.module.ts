import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { LocationsModule } from '../locations/locations.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './clients.repository';

@Module({
  imports: [DatabaseModule, LocationsModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
