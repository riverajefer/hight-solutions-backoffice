import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../utils/constants';
import { PATHS } from '../../router/paths';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Guard que protege rutas autenticadas
 * Redirige a login si no está autenticado
 * Redirige a /change-password si el usuario debe cambiar su contraseña
 */
export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== PATHS.CHANGE_PASSWORD) {
    return <Navigate to={PATHS.CHANGE_PASSWORD} replace />;
  }

  return <>{children}</>;
};
