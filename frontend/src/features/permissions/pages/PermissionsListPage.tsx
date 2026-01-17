import React from 'react';
import { Box } from '@mui/material';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { PermissionTable } from '../components/PermissionTable';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../../../store/authStore';
import { Permission } from '../../../types';
import { PERMISSIONS } from '../../../utils/constants';

/**
 * Página de listado de permisos
 */
const PermissionsListPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = React.useState<Permission | null>(null);

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

  if (permissionsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title="Permisos"
        subtitle="Gestiona los permisos del sistema"
      />

      <PermissionTable
        permissions={permissions}
        isLoading={permissionsQuery.isLoading}
        onDelete={(permission) => setConfirmDelete(permission)}
        canDelete={hasPermission(PERMISSIONS.DELETE_PERMISSIONS)}
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
