import React from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { RoleForm } from '../components/RoleForm';
import { useRoles } from '../hooks/useRoles';
import { CreateRoleDto, UpdateRoleDto } from '../../../types';
import { ROUTES } from '../../../utils/constants';

/**
 * Página de formulario de rol (crear/editar)
 */
const RoleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = React.useState<string | null>(null);

  const { getRoleQuery, createRoleMutation, updateRoleMutation, setPermissionsMutation } =
    useRoles();
  const roleQuery = getRoleQuery(id || '');

  const isEdit = !!id;
  const isLoading = isEdit ? roleQuery.isLoading : false;

  const handleSubmit = async (
    data: CreateRoleDto | UpdateRoleDto,
    permissions?: string[]
  ) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateRoleMutation.mutateAsync({
          id,
          data: data as UpdateRoleDto,
        });
        if (permissions && permissions.length > 0) {
          await setPermissionsMutation.mutateAsync({
            id,
            permissionIds: permissions,
          });
        }
        enqueueSnackbar('Rol actualizado correctamente', { variant: 'success' });
      } else {
        const createdRole = await createRoleMutation.mutateAsync({
          ...data,
          permissionIds: permissions || [],
        } as CreateRoleDto);
        enqueueSnackbar('Rol creado correctamente', { variant: 'success' });
      }
      navigate(ROUTES.ROLES);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar rol';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Rol' : 'Crear Rol'}
        breadcrumbs={[
          { label: 'Roles', path: ROUTES.ROLES },
          { label: isEdit ? 'Editar' : 'Crear' },
        ]}
      />

      <RoleForm
        initialData={isEdit ? roleQuery.data : undefined}
        onSubmit={handleSubmit}
        isLoading={
          createRoleMutation.isPending ||
          updateRoleMutation.isPending ||
          setPermissionsMutation.isPending
        }
        error={error}
        isEdit={isEdit}
      />
    </Box>
  );
};

export default RoleFormPage;
