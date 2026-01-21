import React, { useMemo } from 'react';
import { Role } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { getRoleColumns } from '../config/columns';
import { useNavigate } from 'react-router-dom';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

interface RolesTableProps {
  roles: Role[];
  loading?: boolean;
  onDelete: (role: Role) => void;
}

export const RolesTable: React.FC<RolesTableProps> = ({
  roles,
  loading = false,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const handleEdit = (role: Role) => {
    navigate(ROUTES.ROLES_EDIT.replace(':id', role.id));
  };

  const handleViewPermissions = (role: Role) => {
    navigate(`${ROUTES.ROLES}/${role.id}/permissions`);
  };

  const columns = useMemo(
    () => getRoleColumns({ 
      onEdit: handleEdit, 
      onDelete, 
      onViewPermissions: handleViewPermissions,
      canEdit: hasPermission(PERMISSIONS.UPDATE_ROLES),
      canDelete: hasPermission(PERMISSIONS.DELETE_ROLES)
    }),
    [onDelete, navigate, hasPermission]
  );

  return (
    <DataTable
      rows={roles}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
      onAdd={hasPermission(PERMISSIONS.CREATE_ROLES) ? () => navigate(ROUTES.ROLES_CREATE) : undefined}
      addButtonText="Nuevo Rol"
      searchPlaceholder="Buscar roles..."
    />
  );
};
