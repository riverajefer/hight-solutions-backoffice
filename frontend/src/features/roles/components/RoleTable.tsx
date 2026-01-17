import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Role } from '../../../types';
import { ROUTES } from '../../../utils/constants';
import { DataTable } from '../../../components/common/DataTable';
import { formatDate } from '../../../utils/helpers';

interface RoleTableProps {
  roles: Role[];
  isLoading?: boolean;
  onDelete?: (role: Role) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * Tabla de roles
 */
export const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  isLoading = false,
  onDelete,
  canEdit = false,
  canDelete = false,
}) => {
  const navigate = useNavigate();

  const columns = [
    {
      id: 'name' as const,
      label: 'Nombre',
    },
    {
      id: 'description' as const,
      label: 'Descripción',
      format: (value: unknown) => value || '-',
    },
    {
      id: 'createdAt' as const,
      label: 'Creado',
      format: (value: unknown) => formatDate(value as string),
    },
  ];

  const handleEdit = (role: Role) => {
    navigate(ROUTES.ROLES_EDIT.replace(':id', role.id));
  };

  return (
    <DataTable
      columns={columns}
      rows={roles}
      isLoading={isLoading}
      emptyMessage="No hay roles"
      getRowId={(row) => (row as Role).id}
      actions={(role: Role) => (
        <Box display="flex" gap={1}>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => handleEdit(role)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete?.(role)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    />
  );
};
