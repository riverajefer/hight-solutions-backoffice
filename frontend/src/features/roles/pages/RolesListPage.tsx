import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { RolesTable } from '../components/RolesTable';
import { useRoles } from '../hooks/useRoles';
import { Role } from '../../../types';

/**
 * Página de listado de roles
 */
const RolesListPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const { rolesQuery, deleteRoleMutation } = useRoles();
  const roles = rolesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteRoleMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Rol eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar rol';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Roles"
        subtitle="Gestiona los roles del sistema"
      />

      <RolesTable
        roles={roles}
        loading={rolesQuery.isLoading}
        onDelete={(role) => setConfirmDelete(role)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Rol"
        message={`¿Estás seguro de que deseas eliminar el rol ${confirmDelete?.name}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteRoleMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default RolesListPage;
