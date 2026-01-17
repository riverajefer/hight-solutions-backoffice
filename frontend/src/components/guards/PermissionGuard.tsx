import type { FC, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuthStore } from '../../store/authStore';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string | string[];
  fallback?: ReactNode;
}

/**
 * Guard que protege componentes por permisos
 * Oculta el contenido si no tiene los permisos requeridos
 */
export const PermissionGuard: FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback,
}) => {
  const { hasPermission, hasAnyPermission } = useAuthStore();

  if (!permission) {
    return <>{children}</>;
  }

  const hasAccess = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <Box p={2}>
        <Typography color="error">No tienes permisos para acceder a esta sección</Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
