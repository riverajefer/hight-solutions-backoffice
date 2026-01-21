import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { PermissionsTable } from '../components/PermissionsTable';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../../../types';

/**
 * Página de listado de permisos
 */
const PermissionsListPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Permission | null>(null);

  const { permissionsQuery, deletePermissionMutation } = usePermissions();
  const permissions = permissionsQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deletePermissionMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Permiso eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar permiso';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Permisos"
        subtitle="Gestiona los permisos del sistema"
      />

      <PermissionsTable
        permissions={permissions}
        loading={permissionsQuery.isLoading}
        onDelete={(permission) => setConfirmDelete(permission)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Permiso"
        message={`¿Estás seguro de que deseas eliminar el permiso ${confirmDelete?.name}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deletePermissionMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default PermissionsListPage;
