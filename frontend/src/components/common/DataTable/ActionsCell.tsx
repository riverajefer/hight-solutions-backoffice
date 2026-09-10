import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CircularProgress from '@mui/material/CircularProgress';
import { IconLoadingButton } from '../LoadingButton';

export interface RowAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  tooltip?: string;
  showInMenu?: boolean;
  /** Muestra el spinner en esta acción mientras su petición está en vuelo. */
  loading?: boolean;
  disabled?: boolean;
}

/** @deprecated Usa `RowAction`: el nombre viejo es muy genérico para un barrel. */
export type Action = RowAction;

interface ActionsCellProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPermissions?: () => void;
  extraActions?: RowAction[];
  /** Spinner en las acciones integradas. En la práctica solo `delete` muta. */
  loading?: { view?: boolean; edit?: boolean; delete?: boolean; permissions?: boolean };
}

export const ActionsCell: React.FC<ActionsCellProps> = ({
  onView,
  onEdit,
  onDelete,
  onPermissions,
  extraActions = [],
  loading = {}
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const actions: RowAction[] = [];

  if (onView) {
    actions.push({
      icon: <VisibilityIcon fontSize="small" />,
      label: 'Ver',
      tooltip: 'Ver detalles',
      onClick: onView,
      loading: loading.view,
      color: 'info'
    });
  }

  if (onPermissions) {
    actions.push({
      icon: <VisibilityIcon fontSize="small" />,
      label: 'Permisos',
      tooltip: 'Gestionar permisos',
      onClick: onPermissions,
      loading: loading.permissions,
      color: 'primary'
    });
  }

  if (onEdit) {
    actions.push({
      icon: <EditIcon fontSize="small" />,
      label: 'Editar',
      tooltip: 'Editar registro',
      onClick: onEdit,
      loading: loading.edit,
      color: 'primary'
    });
  }

  if (onDelete) {
    actions.push({
      icon: <DeleteIcon fontSize="small" />,
      label: 'Eliminar',
      tooltip: 'Eliminar registro',
      onClick: onDelete,
      loading: loading.delete,
      color: 'error'
    });
  }

  // Add extra actions
  actions.push(...extraActions);

  if (isMobile) {
    return (
      <Box onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={handleClick}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, index) => (
            <MenuItem 
              key={index} 
              disabled={action.disabled || action.loading}
              onClick={() => {
                action.onClick();
                handleClose();
              }}
            >
              <ListItemIcon sx={{ color: action.color ? `${action.color}.main` : 'inherit' }}>
                {action.loading ? <CircularProgress size={18} color="inherit" /> : action.icon}
              </ListItemIcon>
              <ListItemText primary={action.label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      gap={0.5} 
      justifyContent="center"
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action, index) => (
        <IconLoadingButton
          key={index}
          tooltip={action.tooltip || action.label}
          size="small"
          color={action.color}
          loading={action.loading}
          disabled={action.disabled}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
        >
          {action.icon}
        </IconLoadingButton>
      ))}
    </Box>
  );
};
