import React from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { UserDetail } from '../components/UserDetail';
import { useUsers } from '../hooks/useUsers';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

/**
 * Página de detalle de usuario
 */
const UserViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthStore();
  
  const { getUserQuery } = useUsers();
  const { data: user, isLoading, isError } = getUserQuery(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !user) {
    return <Box>Usuario no encontrado</Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Detalles del Usuario"
        breadcrumbs={[
          { label: 'Usuarios', path: ROUTES.USERS },
          { label: 'Detalles' },
        ]}
      />

      <UserDetail
        user={user}
        onBack={() => navigate(ROUTES.USERS)}
        onEdit={() => navigate(ROUTES.USERS_EDIT.replace(':id', user.id))}
        canEdit={hasPermission(PERMISSIONS.UPDATE_USERS)}
      />
    </Box>
  );
};

export default UserViewPage;
