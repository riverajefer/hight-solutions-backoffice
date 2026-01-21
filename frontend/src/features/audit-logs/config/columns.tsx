import { GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Tooltip, IconButton, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AuditLog } from '../../../types';
import { formatDate } from '../../../utils/helpers';

interface AuditLogColumnsProps {
  onViewDetails: (log: AuditLog) => void;
}

/**
 * Obtiene el color del chip según la acción
 */
const getActionColor = (action: string): 'success' | 'info' | 'error' | 'warning' => {
  switch (action.toLowerCase()) {
    case 'create':
    case 'created':
      return 'success';
    case 'update':
    case 'updated':
      return 'info';
    case 'delete':
    case 'deleted':
      return 'error';
    default:
      return 'warning';
  }
};

/**
 * Formatea el nombre de la acción
 */
const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    create: 'Crear',
    created: 'Creado',
    update: 'Actualizar',
    updated: 'Actualizado',
    delete: 'Eliminar',
    deleted: 'Eliminado',
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
  };
  return actionMap[action.toLowerCase()] || action;
};

/**
 * Formatea el nombre del modelo
 */
const formatModel = (model: string): string => {
  const modelMap: Record<string, string> = {
    User: 'Usuario',
    Role: 'Rol',
    Permission: 'Permiso',
    RolePermission: 'Permiso de Rol',
  };
  return modelMap[model] || model;
};

export const getAuditLogColumns = ({
  onViewDetails,
}: AuditLogColumnsProps): GridColDef<AuditLog>[] => [
  {
    field: 'createdAt',
    headerName: 'Fecha y Hora',
    width: 180,
    valueGetter: (_, row) => row.createdAt,
    renderCell: (params) => (
      <Typography variant="body2">
        {formatDate(params.value as string)}
      </Typography>
    ),
  },
  {
    field: 'action',
    headerName: 'Acción',
    width: 150,
    renderCell: (params) => (
      <Chip
        label={formatAction(params.value as string)}
        color={getActionColor(params.value as string)}
        size="small"
        sx={{ fontWeight: 500 }}
      />
    ),
  },
  {
    field: 'model',
    headerName: 'Recurso',
    width: 150,
    valueGetter: (_, row) => formatModel(row.model),
  },
  {
    field: 'userId',
    headerName: 'Usuario',
    flex: 1,
    minWidth: 200,
    renderCell: (params) => {
      const log = params.row;
      if (!log || !log.user) return log?.userId || 'Sistema';
      const fullName = `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim();
      return (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {fullName || log.user.email}
          </Typography>
          {fullName && (
            <Typography variant="caption" color="textSecondary">
              {log.user.email}
            </Typography>
          )}
        </Box>
      );
    },
  },
  {
    field: 'ipAddress',
    headerName: 'IP',
    width: 140,
    valueGetter: (_, row) => row.ipAddress || '-',
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 100,
    sortable: false,
    filterable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Box display="flex" gap={1} justifyContent="center">
        <Tooltip title="Ver detalles">
          <IconButton
            size="small"
            onClick={() => onViewDetails(params.row)}
            color="primary"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];
