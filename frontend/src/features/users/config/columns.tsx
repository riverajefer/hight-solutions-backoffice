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
    field: 'email',
    headerName: 'Email',
    flex: 1,
    minWidth: 200,
  },
  {
    field: 'role',
    headerName: 'Roles asignados',
    width: 150,
    renderCell: (params) => (
      <Box display="flex" gap={0.5}>
        <Chip 
          label={(params.row as any).role?.name || (params.row as any).roleId || 'Usuario'} 
          size="small" 
          variant="outlined" 
        />
      </Box>
    ),
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
