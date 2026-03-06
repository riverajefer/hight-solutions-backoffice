import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../utils/constants';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Guard que protege rutas autenticadas
 * Redirige a login si no está autenticado
 */
export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
