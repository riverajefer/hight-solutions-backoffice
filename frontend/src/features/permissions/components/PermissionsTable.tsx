import React, { useMemo } from 'react';
import { Permission } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { getPermissionColumns } from '../config/columns';
import { useNavigate } from 'react-router-dom';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

interface PermissionsTableProps {
  permissions: Permission[];
  loading?: boolean;
  onDelete: (permission: Permission) => void;
}

export const PermissionsTable: React.FC<PermissionsTableProps> = ({
  permissions,
  loading = false,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const handleEdit = (permission: Permission) => {
    navigate(`${ROUTES.PERMISSIONS}/${permission.id}/edit`);
  };

  const columns = useMemo(
    () => getPermissionColumns({ 
      onEdit: handleEdit, 
      onDelete,
      canEdit: hasPermission(PERMISSIONS.UPDATE_PERMISSIONS),
      canDelete: hasPermission(PERMISSIONS.DELETE_PERMISSIONS)
    }),
    [onDelete, navigate, hasPermission]
  );

  return (
    <DataTable
      rows={permissions}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
      onAdd={hasPermission(PERMISSIONS.CREATE_PERMISSIONS) ? () => navigate(ROUTES.PERMISSIONS_CREATE) : undefined}
      addButtonText="Nuevo Permiso"
      searchPlaceholder="Buscar permisos..."
    />
  );
};
