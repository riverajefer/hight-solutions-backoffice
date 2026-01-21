import React from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { PermissionForm } from '../components/PermissionForm';
import { usePermissions } from '../hooks/usePermissions';
import { CreatePermissionDto, UpdatePermissionDto } from '../../../types';
import { ROUTES } from '../../../utils/constants';

/**
 * Página de formulario de permiso (crear/editar)
 */
const PermissionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = React.useState<string | null>(null);

  const { getPermissionQuery, createPermissionMutation, updatePermissionMutation } =
    usePermissions();
  
  const permissionQuery = getPermissionQuery(id || '');

  const isEdit = !!id;
  const isLoading = isEdit ? permissionQuery.isLoading : false;

  const handleSubmit = async (
    data: CreatePermissionDto | UpdatePermissionDto
  ) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updatePermissionMutation.mutateAsync({
          id,
          data: data as UpdatePermissionDto,
        });
        enqueueSnackbar('Permiso actualizado correctamente', { variant: 'success' });
      } else {
        await createPermissionMutation.mutateAsync(data as CreatePermissionDto);
        enqueueSnackbar('Permiso creado correctamente', { variant: 'success' });
      }
      navigate(ROUTES.PERMISSIONS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar permiso';
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
        title={isEdit ? 'Editar Permiso' : 'Crear Permiso'}
        breadcrumbs={[
          { label: 'Permisos', path: ROUTES.PERMISSIONS },
          { label: isEdit ? 'Editar' : 'Crear' },
        ]}
      />

      <PermissionForm
        initialData={isEdit ? permissionQuery.data : undefined}
        onSubmit={handleSubmit}
        isLoading={
          createPermissionMutation.isPending ||
          updatePermissionMutation.isPending
        }
        error={error}
        isEdit={isEdit}
      />
    </Box>
  );
};

export default PermissionFormPage;
