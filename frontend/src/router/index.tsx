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
