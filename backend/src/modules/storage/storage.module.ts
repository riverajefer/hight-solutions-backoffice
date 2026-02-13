import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { StorageS3Service } from './storage-s3.service';
import { StorageRepository } from './storage.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StorageController],
  providers: [StorageService, StorageS3Service, StorageRepository],
  exports: [StorageService, StorageS3Service], // Export para que otros módulos puedan usarlo
})
export class StorageModule {}
