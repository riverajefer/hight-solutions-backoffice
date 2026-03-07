import { Tooltip, Typography, Box } from '@mui/material';
import { StatusBadge, ActionsCell } from '../../../components/common/DataTable';
import { Role } from '../../../types';
import { formatDate } from '../../../utils/helpers';
import type { ResponsiveGridColDef } from '../../../hooks';

interface RoleColumnsProps {
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onViewPermissions: (role: Role) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const getRoleColumns = ({
  onEdit,
  onDelete,
  onViewPermissions,
  canEdit = true,
  canDelete = true,
}: RoleColumnsProps): ResponsiveGridColDef<Role>[] => [
  {
    field: 'id',
    headerName: 'ID',
    width: 90,
    responsive: 'lg',
  },
  {
    field: 'name',
    headerName: 'Nombre del rol',
    flex: 1,
    minWidth: 150,
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
    field: 'permissionsCount',
    headerName: 'Permisos',
    width: 120,
    type: 'number',
    responsive: 'sm',
    valueGetter: (_, row) => row.permissions?.length || 0,
  },
  {
    field: 'usersCount',
    headerName: 'Usuarios',
    width: 120,
    type: 'number',
    responsive: 'sm',
    valueGetter: (_, row) => (row as any)._count?.users || 0,
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 120,
    renderCell: (params) => (
      <StatusBadge status={(params.row as any).isActive !== false ? 'active' : 'inactive'} />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Fecha de creación',
    width: 180,
    responsive: 'lg',
    valueFormatter: (value) => formatDate(value as string),
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 150,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <ActionsCell
        onEdit={canEdit ? () => onEdit(params.row) : undefined}
        onDelete={canDelete ? () => onDelete(params.row) : undefined}
        extraActions={[
          {
            icon: <Box sx={{ fontSize: '1.2rem' }}>🔑</Box>,
            label: 'Permisos',
            tooltip: 'Ver permisos',
            onClick: () => onViewPermissions(params.row),
            color: 'info'
          }
        ]}
      />
    ),
  },
];
