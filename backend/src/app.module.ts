import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { UnitsOfMeasureModule } from './modules/portfolio/units-of-measure/units-of-measure.module';
import { ServiceCategoriesModule } from './modules/portfolio/service-categories/service-categories.module';
import { ServicesModule } from './modules/portfolio/services/services.module';
import { SupplyCategoriesModule } from './modules/portfolio/supply-categories/supply-categories.module';
import { SuppliesModule } from './modules/portfolio/supplies/supplies.module';
import { ConsecutivesModule } from './modules/consecutives/consecutives.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductionAreasModule } from './modules/production-areas/production-areas.module';
import { CommercialChannelsModule } from './modules/commercial-channels/commercial-channels.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrderEditRequestsModule } from './modules/order-edit-requests/order-edit-requests.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';

@Module({
  imports: [
    // Configuración centralizada
    ConfigModule,
    // Cron Jobs
    ScheduleModule.forRoot(),
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
    // Módulo de Portfolio (Catálogos de Servicios e Insumos)
    UnitsOfMeasureModule,
    ServiceCategoriesModule,
    ServicesModule,
    SupplyCategoriesModule,
    SuppliesModule,
    // Módulo de Consecutivos (Sistema de numeración automática)
    ConsecutivesModule,
    // Módulo de Cotizaciones
    QuotesModule,
    // Módulo de Órdenes de Pedido
    OrdersModule,
    // Módulo de Áreas de Producción
    ProductionAreasModule,
    // Módulo de Canales de Venta
    CommercialChannelsModule,
    // Módulo de Notificaciones
    NotificationsModule,
    // Módulo de Solicitudes de Edición de Órdenes
    OrderEditRequestsModule,
    // Módulo de Almacenamiento (AWS S3)
    StorageModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
