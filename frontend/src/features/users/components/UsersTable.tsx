import React, { useMemo } from 'react';
import { User } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { getUserColumns } from '../config/columns';
import { useNavigate } from 'react-router-dom';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

interface UsersTableProps {
  users: User[];
  loading?: boolean;
  onDelete: (user: User) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading = false,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const handleEdit = (user: User) => {
    navigate(ROUTES.USERS_EDIT.replace(':id', user.id));
  };

  const handleView = (user: User) => {
    navigate(ROUTES.USERS_VIEW.replace(':id', user.id));
  };

  const columns = useMemo(
    () => getUserColumns({ 
      onEdit: handleEdit, 
      onDelete, 
      onView: handleView,
      canEdit: hasPermission(PERMISSIONS.UPDATE_USERS),
      canDelete: hasPermission(PERMISSIONS.DELETE_USERS)
    }),
    [onDelete, navigate, hasPermission]
  );

  return (
    <DataTable
      rows={users}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
      onAdd={hasPermission(PERMISSIONS.CREATE_USERS) ? () => navigate(ROUTES.USERS_CREATE) : undefined}
      addButtonText="Nuevo Usuario"
      searchPlaceholder="Buscar usuarios..."
    />
  );
};
