import React from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { UserForm } from '../components/UserForm';
import { useUsers } from '../hooks/useUsers';
import { CreateUserDto, UpdateUserDto } from '../../../types';
import { ROUTES } from '../../../utils/constants';

/**
 * Página de formulario de usuario (crear/editar)
 */
const UserFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = React.useState<string | null>(null);

  const { getUserQuery, createUserMutation, updateUserMutation } = useUsers();
  const userQuery = getUserQuery(id || '');

  const isEdit = !!id;
  const isLoading = isEdit ? userQuery.isLoading : false;

  const handleSubmit = async (data: CreateUserDto | UpdateUserDto) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateUserMutation.mutateAsync({ id, data: data as UpdateUserDto });
        enqueueSnackbar('Usuario actualizado correctamente', { variant: 'success' });
      } else {
        await createUserMutation.mutateAsync(data as CreateUserDto);
        enqueueSnackbar('Usuario creado correctamente', { variant: 'success' });
      }
      navigate(ROUTES.USERS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar usuario';
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
        title={isEdit ? 'Editar Usuario' : 'Crear Usuario'}
        breadcrumbs={[
          { label: 'Usuarios', path: ROUTES.USERS },
          { label: isEdit ? 'Editar' : 'Crear' },
        ]}
      />

      <UserForm
        initialData={isEdit ? userQuery.data : undefined}
        onSubmit={handleSubmit}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
        error={error}
        isEdit={isEdit}
      />
    </Box>
  );
};

export default UserFormPage;
