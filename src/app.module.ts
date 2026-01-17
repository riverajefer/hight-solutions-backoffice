import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [
    // Configuración centralizada
    ConfigModule,
    // Base de datos
    DatabaseModule,
    // Módulos de la aplicación
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
})
export class AppModule {}
