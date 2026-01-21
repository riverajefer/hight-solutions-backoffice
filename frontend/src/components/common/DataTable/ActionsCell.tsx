import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
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

interface Action {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  tooltip?: string;
  showInMenu?: boolean;
}

interface ActionsCellProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPermissions?: () => void;
  extraActions?: Action[];
}

export const ActionsCell: React.FC<ActionsCellProps> = ({
  onView,
  onEdit,
  onDelete,
  onPermissions,
  extraActions = []
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

  const actions: Action[] = [];

  if (onView) {
    actions.push({
      icon: <VisibilityIcon fontSize="small" />,
      label: 'Ver',
      tooltip: 'Ver detalles',
      onClick: onView,
      color: 'info'
    });
  }

  if (onPermissions) {
    actions.push({
      icon: <VisibilityIcon fontSize="small" />,
      label: 'Permisos',
      tooltip: 'Gestionar permisos',
      onClick: onPermissions,
      color: 'primary'
    });
  }

  if (onEdit) {
    actions.push({
      icon: <EditIcon fontSize="small" />,
      label: 'Editar',
      tooltip: 'Editar registro',
      onClick: onEdit,
      color: 'primary'
    });
  }

  if (onDelete) {
    actions.push({
      icon: <DeleteIcon fontSize="small" />,
      label: 'Eliminar',
      tooltip: 'Eliminar registro',
      onClick: onDelete,
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
              onClick={() => {
                action.onClick();
                handleClose();
              }}
            >
              <ListItemIcon sx={{ color: action.color ? `${action.color}.main` : 'inherit' }}>
                {action.icon}
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
        <Tooltip key={index} title={action.tooltip || action.label}>
          <IconButton
            size="small"
            color={action.color}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {action.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};
