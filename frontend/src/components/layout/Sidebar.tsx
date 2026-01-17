import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ROUTES, PERMISSIONS } from '../../utils/constants';

const DRAWER_WIDTH = 280;

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

/**
 * Sidebar con navegación
 */
export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission } = useAuthStore();
  const [menuOpen, setMenuOpen] = React.useState({
    users: false,
    roles: false,
    permissions: false,
  });

  const handleMenuClick = (menu: keyof typeof menuOpen) => {
    setMenuOpen((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: ROUTES.DASHBOARD,
      permission: null,
    },
    {
      label: 'Usuarios',
      icon: <PeopleIcon />,
      submenu: [
        {
          label: 'Listar Usuarios',
          path: ROUTES.USERS,
          permission: PERMISSIONS.READ_USERS,
        },
        {
          label: 'Crear Usuario',
          path: ROUTES.USERS_CREATE,
          permission: PERMISSIONS.CREATE_USERS,
        },
      ],
      permission: PERMISSIONS.READ_USERS,
    },
    {
      label: 'Roles',
      icon: <SecurityIcon />,
      submenu: [
        {
          label: 'Listar Roles',
          path: ROUTES.ROLES,
          permission: PERMISSIONS.READ_ROLES,
        },
        {
          label: 'Crear Rol',
          path: ROUTES.ROLES_CREATE,
          permission: PERMISSIONS.CREATE_ROLES,
        },
      ],
      permission: PERMISSIONS.READ_ROLES,
    },
    {
      label: 'Permisos',
      icon: <VerifiedUserIcon />,
      path: ROUTES.PERMISSIONS,
      permission: PERMISSIONS.READ_PERMISSIONS,
    },
  ];

  const content = (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Hight Solutions
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Backoffice
        </Typography>
      </Box>

      <List>
        {navItems.map((item, index) => {
          // Verificar si el usuario tiene permiso
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          if (item.submenu) {
            const menuKey = item.label.toLowerCase() as keyof typeof menuOpen;
            const isMenuOpen = menuOpen[menuKey];

            return (
              <React.Fragment key={index}>
                <ListItem
                  disablePadding
                  onClick={() => handleMenuClick(menuKey)}
                  sx={{ display: 'block' }}
                >
                  <ListItemButton
                    sx={{
                      backgroundColor: item.submenu.some((sub) =>
                        isActive(sub.path)
                      )
                        ? 'action.hover'
                        : 'transparent',
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                    {isMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={isMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subitem, subindex) => {
                      if (subitem.permission && !hasPermission(subitem.permission)) {
                        return null;
                      }

                      return (
                        <ListItem key={subindex} disablePadding>
                          <ListItemButton
                            component={RouterLink}
                            to={subitem.path}
                            sx={{
                              pl: 4,
                              backgroundColor: isActive(subitem.path)
                                ? 'primary.light'
                                : 'transparent',
                              color: isActive(subitem.path) ? 'primary.main' : 'inherit',
                            }}
                          >
                            <ListItemText primary={subitem.label} />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={index} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path!}
                sx={{
                  backgroundColor: isActive(item.path!)
                    ? 'primary.light'
                    : 'transparent',
                  color: isActive(item.path!) ? 'primary.main' : 'inherit',
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {content}
    </Box>
  );
};
