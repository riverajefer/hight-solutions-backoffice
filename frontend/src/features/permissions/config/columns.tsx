import { Tooltip, Typography } from '@mui/material';
import { ActionsCell } from '../../../components/common/DataTable';
import { Permission } from '../../../types';
import { getPermissionLabel } from '../../../utils/permission-labels';
import type { ResponsiveGridColDef } from '../../../hooks';

interface PermissionColumnsProps {
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const getPermissionColumns = ({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: PermissionColumnsProps): ResponsiveGridColDef<Permission>[] => [
  {
    field: 'id',
    headerName: 'ID',
    width: 90,
    responsive: 'lg',
  },
  {
    field: 'name',
    headerName: 'Nombre del permiso',
    flex: 1,
    minWidth: 150,
    valueGetter: (_, row) => getPermissionLabel(row.name),
  },
  {
    field: 'code',
    headerName: 'Código/Key',
    flex: 1,
    minWidth: 150,
    responsive: 'sm',
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
        {(params.row as any).code || params.row.name.toLowerCase().replace(/\s+/g, '_')}
      </Typography>
    ),
  },
  {
    field: 'module',
    headerName: 'Módulo/Categoría',
    width: 150,
    responsive: 'md',
    valueGetter: (_, row) => (row as any).module || 'General',
  },
  {
    field: 'description',
    headerName: 'Descripción',
    flex: 2,
    minWidth: 250,
    responsive: 'md',
    renderCell: (params) => (
      <Tooltip title={params.value || ''}>
        <Typography variant="body2" noWrap>
          {params.value || 'Sin descripción'}
        </Typography>
      </Tooltip>
    ),
  },
  {
    field: 'rolesCount',
    headerName: 'Roles',
    width: 100,
    type: 'number',
    responsive: 'sm',
    valueGetter: (_, row) => (row as any)._count?.roles || 0,
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <ActionsCell
        onEdit={canEdit ? () => onEdit(params.row) : undefined}
        onDelete={canDelete ? () => onDelete(params.row) : undefined}
      />
    ),
  },
];
