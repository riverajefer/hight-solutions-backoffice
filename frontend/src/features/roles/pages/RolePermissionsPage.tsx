import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { PermissionsSelector } from '../components/PermissionsSelector';
import { useRoles } from '../hooks/useRoles';
import { ROUTES } from '../../../utils/constants';

/**
 * Página para gestionar permisos de un rol específico
 */
const RolePermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  
  const { getRoleQuery, setPermissionsMutation } = useRoles();
  const { data: role, isLoading, isError } = getRoleQuery(id || '');
  
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (role?.permissions) {
      setSelectedPermissions(role.permissions.map(p => p.id));
    }
  }, [role]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await setPermissionsMutation.mutateAsync({
        id,
        permissionIds: selectedPermissions,
      });
      enqueueSnackbar('Permisos actualizados correctamente', { variant: 'success' });
      navigate(ROUTES.ROLES);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Error al actualizar permisos', { variant: 'error' });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !role) return <Box sx={{ p: 3 }}>Rol no encontrado</Box>;

  return (
    <Box>
      <PageHeader
        title={`Permisos del Rol: ${role.name}`}
        subtitle="Asigna o remueve permisos para este rol"
        breadcrumbs={[
          { label: 'Roles', path: ROUTES.ROLES },
          { label: 'Permisos' },
        ]}
      />

      <Card>
        <CardContent sx={{ p: 3 }}>
          <PermissionsSelector
            selectedPermissions={selectedPermissions}
            onSelectPermissions={setSelectedPermissions}
            disabled={setPermissionsMutation.isPending}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(ROUTES.ROLES)}
              disabled={setPermissionsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={setPermissionsMutation.isPending}
            >
              {setPermissionsMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RolePermissionsPage;
