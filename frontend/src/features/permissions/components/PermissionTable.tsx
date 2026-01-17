import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Permission } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { formatDate } from '../../../utils/helpers';

interface PermissionTableProps {
  permissions: Permission[];
  isLoading?: boolean;
  onDelete?: (permission: Permission) => void;
  canDelete?: boolean;
}

/**
 * Tabla de permisos
 */
export const PermissionTable: React.FC<PermissionTableProps> = ({
  permissions,
  isLoading = false,
  onDelete,
  canDelete = false,
}) => {
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

  return (
    <DataTable
      columns={columns}
      rows={permissions}
      isLoading={isLoading}
      emptyMessage="No hay permisos"
      getRowId={(row) => (row as Permission).id}
      actions={(permission: Permission) =>
        canDelete ? (
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete?.(permission)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      }
    />
  );
};
