import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SessionLogsModule } from './modules/session-logs/session-logs.module';
import { AreasModule } from './modules/areas/areas.module';
import { CargosModule } from './modules/cargos/cargos.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';

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
    AuditLogsModule,
    SessionLogsModule,
    AreasModule,
    CargosModule,
    // Módulos de ubicaciones, clientes y proveedores
    LocationsModule,
    ClientsModule,
    SuppliersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
