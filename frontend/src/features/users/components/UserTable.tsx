import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { User } from '../../../types';
import { ROUTES } from '../../../utils/constants';
import { DataTable } from '../../../components/common/DataTable';
import { formatDate } from '../../../utils/helpers';

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onDelete?: (user: User) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * Tabla de usuarios
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading = false,
  onDelete,
  canEdit = false,
  canDelete = false,
}) => {
  const navigate = useNavigate();

  const columns = [
    {
      id: 'email' as const,
      label: 'Email',
    },
    {
      id: 'firstName' as const,
      label: 'Nombre',
      format: (value: unknown) => value || '-',
    },
    {
      id: 'lastName' as const,
      label: 'Apellido',
      format: (value: unknown) => value || '-',
    },
    {
      id: 'createdAt' as const,
      label: 'Creado',
      format: (value: unknown) => formatDate(value as string),
    },
  ];

  const handleEdit = (user: User) => {
    navigate(ROUTES.USERS_EDIT.replace(':id', user.id));
  };

  return (
    <DataTable
      columns={columns}
      rows={users}
      isLoading={isLoading}
      emptyMessage="No hay usuarios"
      getRowId={(row) => (row as User).id}
      actions={(user: User) => (
        <Box display="flex" gap={1}>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => handleEdit(user)}
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
                onClick={() => onDelete?.(user)}
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
