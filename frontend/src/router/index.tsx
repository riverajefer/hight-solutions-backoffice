import { lazy, Suspense, type FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AuthGuard, PermissionGuard } from '../components/guards';
import { MainLayout, AuthLayout } from '../components/layout';
import { PATHS } from './paths';
import { PERMISSIONS } from '../utils/constants';

// Lazy load componentes
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const UsersListPage = lazy(() => import('../features/users/pages/UsersListPage'));
const UserFormPage = lazy(() => import('../features/users/pages/UserFormPage'));
const UserViewPage = lazy(() => import('../features/users/pages/UserViewPage'));
const RolesListPage = lazy(() => import('../features/roles/pages/RolesListPage'));
const RoleFormPage = lazy(() => import('../features/roles/pages/RoleFormPage'));
const RolePermissionsPage = lazy(() => import('../features/roles/pages/RolePermissionsPage'));
const PermissionsListPage = lazy(() => import('../features/permissions/pages/PermissionsListPage'));
const PermissionFormPage = lazy(() => import('../features/permissions/pages/PermissionFormPage'));
const AuditLogsListPage = lazy(() => import('../features/audit-logs/pages/AuditLogsListPage'));
const AreasListPage = lazy(() => import('../features/areas/pages/AreasListPage'));
const AreaFormPage = lazy(() => import('../features/areas/pages/AreaFormPage'));
const AreaDetailPage = lazy(() => import('../features/areas/pages/AreaDetailPage'));
const ProductionAreasListPage = lazy(() => import('../features/production-areas/pages/ProductionAreasListPage'));
const ProductionAreaFormPage = lazy(() => import('../features/production-areas/pages/ProductionAreaFormPage'));
const ProductionAreaDetailPage = lazy(() => import('../features/production-areas/pages/ProductionAreaDetailPage'));
const CargosListPage = lazy(() => import('../features/cargos/pages/CargosListPage'));
const CargoFormPage = lazy(() => import('../features/cargos/pages/CargoFormPage'));
const CargoDetailPage = lazy(() => import('../features/cargos/pages/CargoDetailPage'));
const ClientsListPage = lazy(() => import('../features/clients/pages/ClientsListPage'));
const ClientFormPage = lazy(() => import('../features/clients/pages/ClientFormPage'));
const ClientDetailPage = lazy(() => import('../features/clients/pages/ClientDetailPage'));
const SuppliersListPage = lazy(() => import('../features/suppliers/pages/SuppliersListPage'));
const SupplierFormPage = lazy(() => import('../features/suppliers/pages/SupplierFormPage'));
const SupplierDetailPage = lazy(() => import('../features/suppliers/pages/SupplierDetailPage'));
const SessionLogsPage = lazy(() => import('../features/session-logs/pages/SessionLogsPage'));
const ProfilePage = lazy(() => import('../features/settings/pages/ProfilePage'));
// Portfolio - Units of Measure
const UnitsOfMeasureListPage = lazy(() => import('../features/portfolio/units-of-measure/pages/UnitsOfMeasureListPage'));
const UnitOfMeasureFormPage = lazy(() => import('../features/portfolio/units-of-measure/pages/UnitOfMeasureFormPage'));
// Portfolio - Service Categories
const ServiceCategoriesListPage = lazy(() => import('../features/portfolio/service-categories/pages/ServiceCategoriesListPage'));
const ServiceCategoryFormPage = lazy(() => import('../features/portfolio/service-categories/pages/ServiceCategoryFormPage'));
// Portfolio - Services
const ServicesListPage = lazy(() => import('../features/portfolio/services/pages/ServicesListPage'));
const ServiceFormPage = lazy(() => import('../features/portfolio/services/pages/ServiceFormPage'));
// Portfolio - Supply Categories
const SupplyCategoriesListPage = lazy(() => import('../features/portfolio/supply-categories/pages/SupplyCategoriesListPage'));
const SupplyCategoryFormPage = lazy(() => import('../features/portfolio/supply-categories/pages/SupplyCategoryFormPage'));
// Portfolio - Supplies
const SuppliesListPage = lazy(() => import('../features/portfolio/supplies/pages/SuppliesListPage'));
const SupplyFormPage = lazy(() => import('../features/portfolio/supplies/pages/SupplyFormPage'));
// Orders
const OrdersListPage = lazy(() => import('../features/orders/pages/OrdersListPage'));
const OrderFormPage = lazy(() => import('../features/orders/pages/OrderFormPage'));
const OrderDetailPage = lazy(() => import('../features/orders/pages/OrderDetailPage'));
const PendingPaymentOrdersPage = lazy(() => import('../features/orders/pages/PendingPaymentOrdersPage'));
const StatusChangeRequestsPage = lazy(() => import('../features/orders/pages/StatusChangeRequestsPage'));
// Commercial Channels
const CommercialChannelsListPage = lazy(() => import('../features/commercial-channels/pages/CommercialChannelsListPage'));
const CommercialChannelFormPage = lazy(() => import('../features/commercial-channels/pages/CommercialChannelFormPage'));
const CommercialChannelDetailPage = lazy(() => import('../features/commercial-channels/pages/CommercialChannelDetailPage'));
// Quotes
const QuotesListPage = lazy(() => import('../features/quotes/pages/QuotesListPage'));
const QuoteFormPage = lazy(() => import('../features/quotes/pages/QuoteFormPage'));
const QuoteDetailPage = lazy(() => import('../features/quotes/pages/QuoteDetailPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));


const RoutesConfig: FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Auth Routes */}
        <Route
          path={PATHS.LOGIN}
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          path={PATHS.REGISTER}
          element={
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          }
        />

        {/* Protected Routes */}
        <Route
          path={PATHS.DASHBOARD}
          element={
            <AuthGuard>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Users Routes */}
        <Route
          path={PATHS.USERS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_USERS}>
                  <UsersListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.USERS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_USERS}>
                  <UserFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.USERS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_USERS}>
                  <UserFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.USERS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_USERS}>
                  <UserViewPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Roles Routes */}
        <Route
          path={PATHS.ROLES}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_ROLES}>
                  <RolesListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ROLES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_ROLES}>
                  <RoleFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ROLES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_ROLES}>
                  <RoleFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ROLES_PERMISSIONS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_ROLES}>
                  <RolePermissionsPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Permissions Routes */}
        <Route
          path={PATHS.PERMISSIONS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_PERMISSIONS}>
                  <PermissionsListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.PERMISSIONS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_PERMISSIONS}>
                  <PermissionFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.PERMISSIONS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_PERMISSIONS}>
                  <PermissionFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Areas Routes */}
        <Route
          path={PATHS.AREAS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_AREAS}>
                  <AreasListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.AREAS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_AREAS}>
                  <AreaFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.AREAS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_AREAS}>
                  <AreaDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.AREAS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_AREAS}>
                  <AreaFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Production Areas Routes */}
        <Route
          path={PATHS.PRODUCTION_AREAS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_PRODUCTION_AREAS}>
                  <ProductionAreasListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.PRODUCTION_AREAS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_PRODUCTION_AREAS}>
                  <ProductionAreaFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.PRODUCTION_AREAS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_PRODUCTION_AREAS}>
                  <ProductionAreaDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.PRODUCTION_AREAS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_PRODUCTION_AREAS}>
                  <ProductionAreaFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Cargos Routes */}
        <Route
          path={PATHS.CARGOS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_CARGOS}>
                  <CargosListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CARGOS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_CARGOS}>
                  <CargoFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CARGOS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_CARGOS}>
                  <CargoDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CARGOS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_CARGOS}>
                  <CargoFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Clients Routes */}
        <Route
          path={PATHS.CLIENTS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_CLIENTS}>
                  <ClientsListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CLIENTS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_CLIENTS}>
                  <ClientFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CLIENTS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_CLIENTS}>
                  <ClientDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.CLIENTS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_CLIENTS}>
                  <ClientFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Suppliers Routes */}
        <Route
          path={PATHS.SUPPLIERS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SUPPLIERS}>
                  <SuppliersListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLIERS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_SUPPLIERS}>
                  <SupplierFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLIERS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SUPPLIERS}>
                  <SupplierDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLIERS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_SUPPLIERS}>
                  <SupplierFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Units of Measure Routes */}
        <Route
          path={PATHS.UNITS_OF_MEASURE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_UNITS_OF_MEASURE}>
                  <UnitsOfMeasureListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.UNITS_OF_MEASURE_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_UNITS_OF_MEASURE}>
                  <UnitOfMeasureFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.UNITS_OF_MEASURE_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_UNITS_OF_MEASURE}>
                  <UnitOfMeasureFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Service Categories Routes */}
        <Route
          path={PATHS.SERVICE_CATEGORIES}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SERVICE_CATEGORIES}>
                  <ServiceCategoriesListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SERVICE_CATEGORIES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_SERVICE_CATEGORIES}>
                  <ServiceCategoryFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SERVICE_CATEGORIES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_SERVICE_CATEGORIES}>
                  <ServiceCategoryFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Services Routes */}
        <Route
          path={PATHS.SERVICES}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SERVICES}>
                  <ServicesListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SERVICES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_SERVICES}>
                  <ServiceFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SERVICES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_SERVICES}>
                  <ServiceFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Supply Categories Routes */}
        <Route
          path={PATHS.SUPPLY_CATEGORIES}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SUPPLY_CATEGORIES}>
                  <SupplyCategoriesListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLY_CATEGORIES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_SUPPLY_CATEGORIES}>
                  <SupplyCategoryFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLY_CATEGORIES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_SUPPLY_CATEGORIES}>
                  <SupplyCategoryFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Supplies Routes */}
        <Route
          path={PATHS.SUPPLIES}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SUPPLIES}>
                  <SuppliesListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLIES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_SUPPLIES}>
                  <SupplyFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SUPPLIES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_SUPPLIES}>
                  <SupplyFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Orders Routes */}
        <Route
          path={PATHS.ORDERS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_ORDERS}>
                  <OrdersListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ORDERS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_ORDERS}>
                  <OrderFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ORDERS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_ORDERS}>
                  <OrderFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.ORDERS_DETAIL}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_ORDERS}>
                  <OrderDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Quotes Routes */}
        <Route
          path={PATHS.QUOTES}
          element={
            <AuthGuard>
              <MainLayout>
                <QuotesListPage />
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.QUOTES_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <QuoteFormPage />
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.QUOTES_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <QuoteFormPage />
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.QUOTES_DETAIL}
          element={
            <AuthGuard>
              <MainLayout>
                <QuoteDetailPage />
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Commercial Channels Routes */}
        <Route
          path={PATHS.COMMERCIAL_CHANNELS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_COMMERCIAL_CHANNELS}>
                  <CommercialChannelsListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.COMMERCIAL_CHANNELS_CREATE}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.CREATE_COMMERCIAL_CHANNELS}>
                  <CommercialChannelFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.COMMERCIAL_CHANNELS_VIEW}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_COMMERCIAL_CHANNELS}>
                  <CommercialChannelDetailPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.COMMERCIAL_CHANNELS_EDIT}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.UPDATE_COMMERCIAL_CHANNELS}>
                  <CommercialChannelFormPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Audit Logs Routes */}
        <Route
          path={PATHS.AUDIT_LOGS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_AUDIT_LOGS}>
                  <AuditLogsListPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        <Route
          path={PATHS.SESSION_LOGS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_SESSION_LOGS}>
                  <SessionLogsPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Notifications Routes */}
        <Route
          path={PATHS.NOTIFICATIONS}
          element={
            <AuthGuard>
              <MainLayout>
                <NotificationsPage />
              </MainLayout>
            </AuthGuard>
          }
        />
        {/* Pending Payment Orders */}
        <Route
          path={PATHS.PENDING_PAYMENT_ORDERS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.READ_ORDERS}>
                  <PendingPaymentOrdersPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />
        {/* Status Change Requests */}
        <Route
          path={PATHS.STATUS_CHANGE_REQUESTS}
          element={
            <AuthGuard>
              <MainLayout>
                <PermissionGuard permission={PERMISSIONS.APPROVE_ORDERS}>
                  <StatusChangeRequestsPage />
                </PermissionGuard>
              </MainLayout>
            </AuthGuard>
          }
        />

        {/* Settings Routes */}
        <Route
          path={PATHS.PROFILE}
          element={
            <AuthGuard>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </AuthGuard>
          }
        />
        <Route
          path={PATHS.SETTINGS}
          element={<Navigate to={PATHS.PROFILE} replace />}
        />

        {/* Default and Error Routes */}
        <Route path="/" element={<Navigate to={PATHS.DASHBOARD} replace />} />
        <Route path={PATHS.NOT_FOUND} element={<Navigate to={PATHS.DASHBOARD} replace />} />
        <Route path={PATHS.UNAUTHORIZED} element={<Navigate to={PATHS.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={PATHS.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
};

export default RoutesConfig;
