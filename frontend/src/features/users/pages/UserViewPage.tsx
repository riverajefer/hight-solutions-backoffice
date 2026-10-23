import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { twoFactorApi } from '../../../api';
import { TwoFactorStatus, User } from '../../../types';

/** Texto del diálogo de exigir o dejar de exigir el doble factor a un usuario. */
function requirementMessage(
  required: boolean,
  user: User,
  enforcement: TwoFactorStatus['enforcement'] | undefined,
): string {
  const name = user.username || user.email || 'este usuario';
  const parts = required
    ? [
        user.twoFactorEnabled
          ? `${name} ya tiene la app registrada; no podrá desactivarla mientras se le exija.`
          : `En su próximo ingreso ${name} tendrá que registrar una app autenticadora, y su sesión actual no se renovará hasta que lo haga.`,
      ]
    : [
        user.role?.requireTwoFactor
          ? `Su rol lo sigue exigiendo, así que ${name} lo seguirá usando.`
          : `${name} conserva la app si ya la registró, pero podrá desactivarla desde su perfil.`,
      ];
  if (enforcement && enforcement !== 'required') {
    parts.push(
      'Ojo: el doble factor no está en modo obligatorio en el servidor, así que esta exigencia se aplicará cuando lo esté.',
    );
  }
  return parts.join(' ');
}

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
  // `true`/`false` = qué se va a pedir; `null` = diálogo cerrado.
  const [pendingRequirement, setPendingRequirement] = useState<boolean | null>(null);
  
  const { getUserQuery, deactivateUserMutation, resetTwoFactorMutation, setTwoFactorRequirementMutation } =
    useUsers();
  const canRequireTwoFactor = hasPermission(PERMISSIONS.REQUIRE_USER_2FA);
  // El modo del servidor (off/optional/required) sale del estado del propio usuario.
  const twoFactorStatusQuery = useQuery({
    queryKey: ['two-factor', 'status'],
    queryFn: () => twoFactorApi.getStatus(),
    enabled: canRequireTwoFactor,
  });
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

  const handleSetRequirement = async () => {
    if (!id || pendingRequirement === null) return;

    try {
      await setTwoFactorRequirementMutation.mutateAsync({ id, required: pendingRequirement });
      enqueueSnackbar(
        pendingRequirement
          ? 'Ahora se le exige la verificación en dos pasos'
          : 'Ya no se le exige la verificación en dos pasos a este usuario',
        { variant: 'success' },
      );
      setPendingRequirement(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cambiar la exigencia';
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
        onToggleRequireTwoFactor={setPendingRequirement}
        canEdit={hasPermission(PERMISSIONS.UPDATE_USERS)}
        canDeactivate={canDeactivate}
        canResetTwoFactor={hasPermission(PERMISSIONS.RESET_USER_2FA) && currentUser?.id !== user.id}
        canRequireTwoFactor={canRequireTwoFactor}
      />

      <ConfirmDialog
        open={pendingRequirement !== null}
        title={pendingRequirement ? 'Exigir verificación en dos pasos' : 'Dejar de exigir verificación en dos pasos'}
        message={requirementMessage(
          pendingRequirement === true,
          user,
          twoFactorStatusQuery.data?.enforcement,
        )}
        onConfirm={handleSetRequirement}
        onCancel={() => setPendingRequirement(null)}
        isLoading={setTwoFactorRequirementMutation.isPending}
        confirmText={pendingRequirement ? 'Exigir' : 'Dejar de exigir'}
        severity={pendingRequirement ? 'info' : 'warning'}
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
