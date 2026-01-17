import type { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};
