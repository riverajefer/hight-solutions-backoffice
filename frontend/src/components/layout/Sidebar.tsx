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
  alpha,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryIcon from '@mui/icons-material/History';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/authStore';
import { ROUTES, PERMISSIONS } from '../../utils/constants';
import logo from '../../assets/logo.png';

const DRAWER_WIDTH = 280;

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

/**
 * Sidebar con navegación mejorada
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

  const isActive = (path: string, siblings: string[] = []) => {
    if (path === ROUTES.DASHBOARD) {
      return location.pathname === path;
    }
    
    const isMatch = location.pathname.startsWith(path);
    if (!isMatch) return false;

    // Si hay un match exacto, ese gana
    if (location.pathname === path) return true;

    // Si es un prefijo, verificamos si hay un hermano que sea un match más específico (largo)
    const hasMoreSpecificSibling = siblings.some(
      (s) => s !== path && s.length > path.length && location.pathname.startsWith(s)
    );

    return !hasMoreSpecificSibling;
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
    {
      label: 'Logs de Auditoría',
      icon: <HistoryIcon />,
      path: ROUTES.AUDIT_LOGS,
      permission: PERMISSIONS.READ_AUDIT_LOGS,
    },
  ];

  const getItemStyles = (active: boolean) => ({
    mx: 1.5,
    my: 0.5,
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: active 
      ? alpha(theme.palette.primary.main, 0.12) 
      : 'transparent',
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
    '&:hover': {
      backgroundColor: active 
        ? alpha(theme.palette.primary.main, 0.18) 
        : alpha(theme.palette.action.hover, 0.08),
      transform: 'translateX(4px)',
    },
    '& .MuiListItemIcon-root': {
      color: active ? theme.palette.primary.main : theme.palette.text.secondary,
      minWidth: 40,
    },
    '& .MuiListItemText-primary': {
      fontWeight: active ? 600 : 500,
      fontSize: '0.875rem',
    },
  });

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      <Box 
        sx={{ 
          p: 3, 
          m: 2,
          mb: 4,
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '16px',
          background: theme.palette.mode === 'light' 
            ? `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)` 
            : 'transparent',
          boxShadow: theme.palette.mode === 'light' 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            : 'none',
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Hight Solutions Logo"
          sx={{ 
            width: '100%',
            maxWidth: 160,
            height: 'auto',
            objectFit: 'contain',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            }
          }}
        />
      </Box>

      <List sx={{ px: 1 }}>
        {navItems.map((item, index) => {
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          if (item.submenu) {
            const menuKey = item.label.toLowerCase() as keyof typeof menuOpen;
            const isMenuOpen = menuOpen[menuKey];
            const siblingPaths = item.submenu.map(sub => sub.path);
            const isSubChildActive = item.submenu.some((sub) => isActive(sub.path, siblingPaths));

            return (
              <React.Fragment key={index}>
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => handleMenuClick(menuKey)}
                    sx={getItemStyles(isSubChildActive)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                    {isMenuOpen ? <ExpandLess sx={{ fontSize: '1.2rem' }} /> : <ExpandMore sx={{ fontSize: '1.2rem' }} />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={isMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ mb: 1 }}>
                    {item.submenu.map((subitem, subindex) => {
                      if (subitem.permission && !hasPermission(subitem.permission)) {
                        return null;
                      }

                      const active = isActive(subitem.path, siblingPaths);
                      return (
                        <ListItem key={subindex} disablePadding>
                          <ListItemButton
                            component={RouterLink}
                            to={subitem.path}
                            sx={{
                              ...getItemStyles(active),
                              pl: 6,
                              mx: 2,
                              '&:hover': {
                                ...getItemStyles(active)['&:hover'],
                                transform: 'translateX(6px)',
                              }
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

          const topLevelPaths = navItems.filter(i => i.path).map(i => i.path!);
          const active = isActive(item.path!, topLevelPaths);
          return (
            <ListItem key={index} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path!}
                sx={getItemStyles(active)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Box sx={{ mt: 'auto', p: 2, mb: 1 }}>
        <Box 
          sx={{ 
            p: 2, 
            borderRadius: '16px', 
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Estado de Sesión
          </Typography>
          <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
            En línea
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: DRAWER_WIDTH, borderRight: 'none' }
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
        borderRight: `1px solid ${theme.palette.divider}`,
        height: '100vh',
        position: 'sticky',
        top: 0,
        bgcolor: 'background.paper',
      }}
    >
      {content}
    </Box>
  );
};

