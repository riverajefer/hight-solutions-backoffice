import React from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { UserTable } from '../components/UserTable';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../../../store/authStore';
import { User } from '../../../types';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import AddIcon from '@mui/icons-material/Add';

/**
 * Página de listado de usuarios
 */
const UsersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = React.useState<User | null>(null);

  const { usersQuery, deleteUserMutation } = useUsers();
  const users = usersQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteUserMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Usuario eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar usuario';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (usersQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios del sistema"
        action={
          hasPermission(PERMISSIONS.CREATE_USERS) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.USERS_CREATE)}
            >
              Crear Usuario
            </Button>
          )
        }
      />

      <UserTable
        users={users}
        isLoading={usersQuery.isLoading}
        onDelete={(user) => setConfirmDelete(user)}
        canEdit={hasPermission(PERMISSIONS.UPDATE_USERS)}
        canDelete={hasPermission(PERMISSIONS.DELETE_USERS)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario ${confirmDelete?.email}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteUserMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default UsersListPage;
