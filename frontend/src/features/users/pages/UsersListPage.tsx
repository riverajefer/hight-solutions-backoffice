import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { UsersTable } from '../components/UsersTable';
import { useUsers } from '../hooks/useUsers';
import { User } from '../../../types';

/**
 * Página de listado de usuarios
 */
const UsersListPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

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

  return (
    <Box>
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios del sistema"
      />

      <UsersTable
        users={users}
        loading={usersQuery.isLoading}
        onDelete={(user) => setConfirmDelete(user)}
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
