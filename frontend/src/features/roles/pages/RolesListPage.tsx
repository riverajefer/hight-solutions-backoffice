import React from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { RoleTable } from '../components/RoleTable';
import { useRoles } from '../hooks/useRoles';
import { useAuthStore } from '../../../store/authStore';
import { Role } from '../../../types';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import AddIcon from '@mui/icons-material/Add';

/**
 * Página de listado de roles
 */
const RolesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = React.useState<Role | null>(null);

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

  if (rolesQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title="Roles"
        subtitle="Gestiona los roles del sistema"
        action={
          hasPermission(PERMISSIONS.CREATE_ROLES) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.ROLES_CREATE)}
            >
              Crear Rol
            </Button>
          )
        }
      />

      <RoleTable
        roles={roles}
        isLoading={rolesQuery.isLoading}
        onDelete={(role) => setConfirmDelete(role)}
        canEdit={hasPermission(PERMISSIONS.UPDATE_ROLES)}
        canDelete={hasPermission(PERMISSIONS.DELETE_ROLES)}
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
