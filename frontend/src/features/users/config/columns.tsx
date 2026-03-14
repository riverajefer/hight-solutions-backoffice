import { Chip, Box } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { StatusBadge, ActionsCell } from '../../../components/common/DataTable';
import { User } from '../../../types';
import { formatDate } from '../../../utils/helpers';
import type { ResponsiveGridColDef } from '../../../hooks';

interface UserColumnsProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const getUserColumns = ({
  onEdit,
  onDelete,
  onView,
  canEdit = true,
  canDelete = true,
}: UserColumnsProps): ResponsiveGridColDef<User>[] => [
  {
    field: 'id',
    headerName: 'ID',
    width: 90,
    responsive: 'lg',
  },
  {
    field: 'fullName',
    headerName: 'Nombre completo',
    flex: 1,
    minWidth: 200,
    valueGetter: (_: any, row: User) => {
      const { firstName, lastName } = row;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'N/A';
    },
  },
  {
    field: 'username',
    headerName: 'Usuario',
    flex: 1,
    minWidth: 150,
    responsive: 'sm',
    valueGetter: (_: any, row: User) => row.username || '—',
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1,
    minWidth: 200,
    responsive: 'md',
    valueGetter: (_: any, row: User) => row.email || '—',
  },
  {
    field: 'role',
    headerName: 'Rol',
    width: 130,
    responsive: 'sm',
    renderCell: (params: GridRenderCellParams<User>) => (
      <Box display="flex" gap={0.5}>
        <Chip
          label={params.row.role?.name || params.row.roleId || 'Usuario'}
          size="small"
          variant="outlined"
        />
      </Box>
    ),
  },
  {
    field: 'cargo',
    headerName: 'Cargo',
    width: 180,
    responsive: 'lg',
    renderCell: (params: GridRenderCellParams<User>) => {
      const cargo = (params.row as any).cargo;
      if (!cargo) {
        return <Chip label="Sin cargo" size="small" variant="outlined" color="default" />;
      }
      return (
        <Box display="flex" gap={0.5} alignItems="center">
          <Chip
            label={cargo.name}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>
      );
    },
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 120,
    renderCell: (params: GridRenderCellParams<User>) => (
      <StatusBadge status={params.row.isActive !== false ? 'active' : 'inactive'} />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Fecha de creación',
    width: 180,
    responsive: 'sm',
    valueFormatter: (value: any) => formatDate(value as string),
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams<User>) => (
      <ActionsCell
        onView={() => onView(params.row)}
        onEdit={canEdit ? () => onEdit(params.row) : undefined}
        onDelete={canDelete ? () => onDelete(params.row) : undefined}
      />
    ),
  },
];
