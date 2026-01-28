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
import LoginIcon from '@mui/icons-material/Login';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import BadgeIcon from '@mui/icons-material/Badge';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import StraightenIcon from '@mui/icons-material/Straighten';
import CategoryIcon from '@mui/icons-material/Category';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/authStore';
import { ROUTES, PERMISSIONS } from '../../utils/constants';
import { gradients, neonColors, neonAccents, darkSurfaces } from '../../theme';
import logo from '../../assets/logo.png';

const DRAWER_WIDTH = 280;

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

/**
 * Sidebar con navegación estilo Neón Elegante
 */
export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const { hasPermission } = useAuthStore();
  const [menuOpen, setMenuOpen] = React.useState({
    users: false,
    roles: false,
    permissions: false,
    areas: false,
    cargos: false,
    clientes: false,
    proveedores: false,
    portfolio: false,
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

    if (location.pathname === path) return true;

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
      label: 'Clientes',
      icon: <BadgeIcon />,
      submenu: [
        {
          label: 'Listar Clientes',
          path: ROUTES.CLIENTS,
          permission: PERMISSIONS.READ_CLIENTS,
        },
        {
          label: 'Crear Cliente',
          path: ROUTES.CLIENTS_CREATE,
          permission: PERMISSIONS.CREATE_CLIENTS,
        },
      ],
      permission: PERMISSIONS.READ_CLIENTS,
    },
    {
      label: 'Proveedores',
      icon: <LocalShippingIcon />,
      submenu: [
        {
          label: 'Listar Proveedores',
          path: ROUTES.SUPPLIERS,
          permission: PERMISSIONS.READ_SUPPLIERS,
        },
        {
          label: 'Crear Proveedor',
          path: ROUTES.SUPPLIERS_CREATE,
          permission: PERMISSIONS.CREATE_SUPPLIERS,
        },
      ],
      permission: PERMISSIONS.READ_SUPPLIERS,
    },
    {
      label: 'Portafolio',
      icon: <InventoryIcon />,
      submenu: [
        {
          label: 'Unidades de Medida',
          icon: <StraightenIcon />,
          path: ROUTES.UNITS_OF_MEASURE,
          permission: PERMISSIONS.READ_UNITS_OF_MEASURE,
        },
        {
          label: 'Categorías de Servicios',
          icon: <CategoryIcon />,
          path: ROUTES.SERVICE_CATEGORIES,
          permission: PERMISSIONS.READ_SERVICE_CATEGORIES,
        },
        {
          label: 'Servicios',
          icon: <MiscellaneousServicesIcon />,
          path: ROUTES.SERVICES,
          permission: PERMISSIONS.READ_SERVICES,
        },
        {
          label: 'Categorías de Insumos',
          icon: <FolderSpecialIcon />,
          path: ROUTES.SUPPLY_CATEGORIES,
          permission: PERMISSIONS.READ_SUPPLY_CATEGORIES,
        },
        {
          label: 'Insumos',
          icon: <Inventory2Icon />,
          path: ROUTES.SUPPLIES,
          permission: PERMISSIONS.READ_SUPPLIES,
        },
      ],
      // El menú se muestra si el usuario tiene permiso para cualquiera de los submódulos
      permissions: [
        PERMISSIONS.READ_UNITS_OF_MEASURE,
        PERMISSIONS.READ_SERVICE_CATEGORIES,
        PERMISSIONS.READ_SERVICES,
        PERMISSIONS.READ_SUPPLY_CATEGORIES,
        PERMISSIONS.READ_SUPPLIES,
      ],
    },
    {
      label: 'Áreas',
      icon: <BusinessIcon />,
      submenu: [
        {
          label: 'Listar Áreas',
          path: ROUTES.AREAS,
          permission: PERMISSIONS.READ_AREAS,
        },
        {
          label: 'Crear Área',
          path: ROUTES.AREAS_CREATE,
          permission: PERMISSIONS.CREATE_AREAS,
        },
      ],
      permission: PERMISSIONS.READ_AREAS,
    },
    {
      label: 'Cargos',
      icon: <WorkIcon />,
      submenu: [
        {
          label: 'Listar Cargos',
          path: ROUTES.CARGOS,
          permission: PERMISSIONS.READ_CARGOS,
        },
        {
          label: 'Crear Cargo',
          path: ROUTES.CARGOS_CREATE,
          permission: PERMISSIONS.CREATE_CARGOS,
        },
      ],
      permission: PERMISSIONS.READ_CARGOS,
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
    {
      label: 'Historial de Sesiones',
      icon: <LoginIcon />,
      path: ROUTES.SESSION_LOGS,
      permission: PERMISSIONS.READ_SESSION_LOGS,
    },
  ];

  const getItemStyles = (active: boolean) => ({
    mx: 1.5,
    my: 0.5,
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    background: active
      ? isDark
        ? `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.2)}, ${alpha(neonAccents.vividPurple, 0.1)})`
        : `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.12)}, ${alpha(neonAccents.vividPurple, 0.06)})`
      : 'transparent',
    boxShadow: active && isDark
      ? `inset 0 0 20px ${alpha(neonColors.primary.main, 0.15)}`
      : active
        ? `0 2px 8px ${alpha(neonColors.primary.main, 0.15)}`
        : 'none',
    color: active
      ? isDark
        ? neonColors.primary.main
        : neonColors.primary.dark
      : theme.palette.text.primary,
    '&::before': active ? {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 4,
      height: '60%',
      background: `linear-gradient(180deg, ${neonColors.primary.main}, ${neonAccents.vividPurple})`,
      borderRadius: '0 4px 4px 0',
      boxShadow: isDark ? `0 0 10px ${neonColors.primary.main}` : 'none',
    } : {},
    '&:hover': {
      backgroundColor: alpha(neonColors.primary.main, isDark ? 0.15 : 0.08),
      transform: 'translateX(4px)',
    },
    '& .MuiListItemIcon-root': {
      color: active
        ? neonColors.primary.main
        : theme.palette.text.secondary,
      minWidth: 40,
      transition: 'all 0.3s ease',
      filter: active && isDark
        ? `drop-shadow(0 0 4px ${alpha(neonColors.primary.main, 0.6)})`
        : 'none',
    },
    '& .MuiListItemText-primary': {
      fontWeight: active ? 600 : 500,
      fontSize: '0.875rem',
    },
  });

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: isDark
          ? gradients.darkSidebar
          : `linear-gradient(180deg, #F1F5F9 0%, #EDE9FE 100%)`,
      }}
    >
      {/* Logo Container */}
      <Box
        sx={{
          p: 3,
          m: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '16px',
          background: isDark
            ? `linear-gradient(135deg, ${darkSurfaces.navyMist} 0%, ${darkSurfaces.cosmicPurple} 100%)`
            : `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
          boxShadow: isDark
            ? `0 10px 30px ${alpha(neonColors.primary.main, 0.2)}, 0 0 20px ${alpha(neonAccents.vividPurple, 0.15)}`
            : '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: isDark
            ? `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`
            : 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: isDark
              ? `0 15px 40px ${alpha(neonColors.primary.main, 0.25)}, 0 0 30px ${alpha(neonAccents.vividPurple, 0.2)}`
              : '0 15px 30px -5px rgba(0, 0, 0, 0.25)',
            transform: 'translateY(-2px)',
          },
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
            filter: isDark ? 'drop-shadow(0 0 8px rgba(46, 176, 196, 0.3))' : 'none',
            '&:hover': {
              transform: 'scale(1.05)',
            }
          }}
        />
      </Box>

      {/* Navigation List */}
      <List sx={{ px: 1, flex: 1 }}>
        {navItems.map((item, index) => {
          // Check permissions: single permission or array of permissions (any match)
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }
          if (item.permissions && !item.permissions.some(p => hasPermission(p))) {
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

      {/* Session Status Card */}
      <Box sx={{ mt: 'auto', p: 2, mb: 1 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: '16px',
            background: isDark
              ? `linear-gradient(135deg, ${alpha(neonColors.primary.main, 0.1)}, ${alpha(neonAccents.vividPurple, 0.08)})`
              : alpha(neonColors.primary.main, 0.04),
            border: `1px solid ${isDark
              ? alpha(neonAccents.vividPurple, 0.2)
              : alpha(neonColors.primary.main, 0.1)}`,
            boxShadow: isDark
              ? `0 0 15px ${alpha(neonColors.primary.main, 0.1)}`
              : 'none',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Estado de Sesión
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: isDark
                  ? `0 0 8px ${theme.palette.success.main}, 0 0 16px ${alpha(theme.palette.success.main, 0.5)}`
                  : 'none',
                animation: isDark ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': {
                    boxShadow: `0 0 8px ${theme.palette.success.main}`,
                  },
                  '50%': {
                    boxShadow: `0 0 16px ${theme.palette.success.main}, 0 0 24px ${alpha(theme.palette.success.main, 0.5)}`,
                  },
                },
              }}
            />
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
          sx: {
            width: DRAWER_WIDTH,
            borderRight: 'none',
            background: isDark
              ? gradients.darkSidebar
              : `linear-gradient(180deg, #F1F5F9 0%, #EDE9FE 100%)`,
          }
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
        borderRight: `1px solid ${isDark
          ? alpha(neonAccents.vividPurple, 0.2)
          : theme.palette.divider}`,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: isDark
          ? gradients.darkSidebar
          : `linear-gradient(180deg, #F1F5F9 0%, #EDE9FE 100%)`,
      }}
    >
      {content}
    </Box>
  );
};
