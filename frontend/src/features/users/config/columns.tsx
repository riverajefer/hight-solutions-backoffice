import { GridColDef } from '@mui/x-data-grid';
import { Chip, Box } from '@mui/material';
import { StatusBadge, ActionsCell } from '../../../components/common/DataTable';
import { User } from '../../../types';
import { formatDate } from '../../../utils/helpers';

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
}: UserColumnsProps): GridColDef<User>[] => [
  {
    field: 'id',
    headerName: 'ID',
    width: 90,
  },
  {
    field: 'fullName',
    headerName: 'Nombre completo',
    flex: 1,
    minWidth: 200,
    valueGetter: (_, row) => {
      const { firstName, lastName } = row;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'N/A';
    },
  },
  {
    field: 'username',
    headerName: 'Usuario',
    flex: 1,
    minWidth: 150,
    valueGetter: (_, row) => row.username || '—',
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1,
    minWidth: 200,
    valueGetter: (_, row) => row.email || '—',
  },
  {
    field: 'role',
    headerName: 'Rol',
    width: 130,
    renderCell: (params) => (
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
    renderCell: (params) => {
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
    renderCell: (params) => (
      <StatusBadge status={params.row.isActive !== false ? 'active' : 'inactive'} />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Fecha de creación',
    width: 180,
    valueFormatter: (value) => formatDate(value as string),
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <ActionsCell
        onView={() => onView(params.row)}
        onEdit={canEdit ? () => onEdit(params.row) : undefined}
        onDelete={canDelete ? () => onDelete(params.row) : undefined}
      />
    ),
  },
];
