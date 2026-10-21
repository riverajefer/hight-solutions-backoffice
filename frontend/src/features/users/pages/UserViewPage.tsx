import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { UserDetail } from '../components/UserDetail';
import { useUsers } from '../hooks/useUsers';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

/**
 * Página de detalle de usuario
 */
const UserViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission, user: currentUser } = useAuthStore();
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [confirmResetTwoFactorOpen, setConfirmResetTwoFactorOpen] = useState(false);
  
  const { getUserQuery, deactivateUserMutation, resetTwoFactorMutation } = useUsers();
  const { data: user, isLoading, isError } = getUserQuery(id || '');

  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const canDeactivate = isAdmin && user?.isActive !== false;

  const handleDeactivate = async () => {
    if (!id) return;

    try {
      await deactivateUserMutation.mutateAsync(id);
      enqueueSnackbar('Usuario desactivado correctamente', { variant: 'success' });
      navigate(ROUTES.USERS);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al desactivar usuario';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleResetTwoFactor = async () => {
    if (!id) return;

    try {
      await resetTwoFactorMutation.mutateAsync(id);
      enqueueSnackbar('Verificación en dos pasos restablecida. Al entrar registrará la app de nuevo.', {
        variant: 'success',
      });
      setConfirmResetTwoFactorOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al restablecer la verificación';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !user) {
    return <Box>Usuario no encontrado</Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Detalles del Usuario"
        breadcrumbs={[
          { label: 'Usuarios', path: ROUTES.USERS },
          { label: 'Detalles' },
        ]}
      />

      <UserDetail
        user={user}
        onBack={() => navigate(ROUTES.USERS)}
        onEdit={() => navigate(ROUTES.USERS_EDIT.replace(':id', user.id))}
        onDeactivate={() => setConfirmDeactivateOpen(true)}
        onResetTwoFactor={() => setConfirmResetTwoFactorOpen(true)}
        canEdit={hasPermission(PERMISSIONS.UPDATE_USERS)}
        canDeactivate={canDeactivate}
        canResetTwoFactor={hasPermission(PERMISSIONS.RESET_USER_2FA) && currentUser?.id !== user.id}
      />

      <ConfirmDialog
        open={confirmResetTwoFactorOpen}
        title="Restablecer verificación en dos pasos"
        message={`Se borrará la app autenticadora y los códigos de respaldo de ${user.username || user.email || 'este usuario'}, y se cerrarán sus sesiones. La próxima vez que entre tendrá que registrar la app de nuevo. Úsalo cuando perdió o cambió el celular.`}
        onConfirm={handleResetTwoFactor}
        onCancel={() => setConfirmResetTwoFactorOpen(false)}
        isLoading={resetTwoFactorMutation.isPending}
        confirmText="Restablecer"
        severity="warning"
      />

      <ConfirmDialog
        open={confirmDeactivateOpen}
        title="Desactivar Usuario"
        message={`¿Estás seguro de que deseas desactivar al usuario ${user.email || user.username || user.id}?`}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivateOpen(false)}
        isLoading={deactivateUserMutation.isPending}
        confirmText="Desactivar"
        severity="warning"
      />
    </Box>
  );
};

export default UserViewPage;
