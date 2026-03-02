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
  IconButton,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryIcon from '@mui/icons-material/History';
import LoginIcon from '@mui/icons-material/Login';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import BadgeIcon from '@mui/icons-material/Badge';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactoryIcon from '@mui/icons-material/Factory';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PostAddIcon from '@mui/icons-material/PostAdd';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BuildIcon from '@mui/icons-material/Build';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useAuthStore } from '../../store/authStore';
import { ROUTES, PERMISSIONS } from '../../utils/constants';
import { neonColors, neonAccents } from '../../theme';
import logo from '../../assets/logo.png';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 72;
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #151c3a 0%, #1c315a 100%)';

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemSub {
  label: string;
  path: string;
  icon?: React.ReactNode;
  permission?: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string | null;
  permissions?: string[];
  menuKey?: string;
  submenu?: NavItemSub[];
}

/**
 * Sidebar con navegación estilo Neón Elegante
 */
export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const { hasPermission } = useAuthStore();
  const [menuOpen, setMenuOpen] = React.useState({
    comercial: false,
    logistica: false,
    organizacion: false,
    configuracion: false,
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

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: ROUTES.DASHBOARD,
      permission: null,
    },
    {
      label: 'Comercial',
      icon: <ShoppingCartIcon />,
      menuKey: 'comercial',
      submenu: [
        {
          label: 'Cotizaciones',
          icon: <PostAddIcon />,
          path: '/quotes',
          // permission: PERMISSIONS.READ_QUOTES, // Add later if needed
        },
        {
          label: 'Órdenes de Pedido',
          icon: <ReceiptIcon />,
          path: ROUTES.ORDERS,
          permission: PERMISSIONS.READ_ORDERS,
        },
        {
          label: 'Órdenes de Trabajo',
          icon: <BuildIcon />,
          path: ROUTES.WORK_ORDERS,
          permission: PERMISSIONS.READ_WORK_ORDERS,
        },
        {
          label: 'Órdenes de Gastos',
          icon: <RequestQuoteIcon />,
          path: ROUTES.EXPENSE_ORDERS,
          permission: PERMISSIONS.READ_EXPENSE_ORDERS,
        },
        {
          label: 'Órdenes Pendientes de Pago',
          icon: <PaymentsIcon />,
          path: ROUTES.PENDING_PAYMENT_ORDERS,
          permission: PERMISSIONS.READ_ORDERS,
        },
        {
          label: 'Solicitudes Pendientes',
          icon: <PendingActionsIcon />,
          path: ROUTES.STATUS_CHANGE_REQUESTS,
          permission: PERMISSIONS.APPROVE_ORDERS,
        },
        {
          label: 'Trazabilidad',
          icon: <AccountTreeIcon />,
          path: ROUTES.ORDER_FLOW_BASE,
          permission: PERMISSIONS.READ_ORDERS,
        },
        {
          label: 'Clientes',
          icon: <BadgeIcon />,
          path: ROUTES.CLIENTS,
          permission: PERMISSIONS.READ_CLIENTS,
        },
        {
          label: 'Canales de Venta',
          icon: <StoreIcon />,
          path: '/commercial-channels',
          permission: PERMISSIONS.READ_COMMERCIAL_CHANNELS,
        },
      ],
      permissions: [
        PERMISSIONS.READ_ORDERS,
        PERMISSIONS.READ_WORK_ORDERS,
        PERMISSIONS.READ_EXPENSE_ORDERS,
        PERMISSIONS.READ_CLIENTS,
        PERMISSIONS.READ_COMMERCIAL_CHANNELS,
      ],
    },
    {
      label: 'Logística',
      icon: <InventoryIcon />,
      menuKey: 'logistica',
      submenu: [
        {
          label: 'Proveedores',
          icon: <LocalShippingIcon />,
          path: ROUTES.SUPPLIERS,
          permission: PERMISSIONS.READ_SUPPLIERS,
        },
        {
          label: 'Áreas de Producción',
          icon: <FactoryIcon />,
          path: ROUTES.PRODUCTION_AREAS,
          permission: PERMISSIONS.READ_PRODUCTION_AREAS,
        },
        {
          label: 'Productos',
          icon: <MiscellaneousServicesIcon />,
          path: ROUTES.PRODUCTS,
          permission: PERMISSIONS.READ_PRODUCTS,
        },
        {
          label: 'Insumos',
          icon: <Inventory2OutlinedIcon />,
          path: ROUTES.SUPPLIES,
          permission: PERMISSIONS.READ_SUPPLIES,
        },
        {
          label: 'Categorías Productos',
          icon: <CategoryOutlinedIcon />,
          path: ROUTES.PRODUCT_CATEGORIES,
          permission: PERMISSIONS.READ_PRODUCT_CATEGORIES,
        },
        {
          label: 'Categorías Insumos',
          icon: <FolderSpecialOutlinedIcon />,
          path: ROUTES.SUPPLY_CATEGORIES,
          permission: PERMISSIONS.READ_SUPPLY_CATEGORIES,
        },
        {
          label: 'Unidades de Medida',
          icon: <StraightenOutlinedIcon />,
          path: ROUTES.UNITS_OF_MEASURE,
          permission: PERMISSIONS.READ_UNITS_OF_MEASURE,
        },
      ],
      permissions: [
        PERMISSIONS.READ_SUPPLIERS,
        PERMISSIONS.READ_PRODUCTION_AREAS,
        PERMISSIONS.READ_PRODUCTS,
        PERMISSIONS.READ_SUPPLIES,
        PERMISSIONS.READ_PRODUCT_CATEGORIES,
        PERMISSIONS.READ_SUPPLY_CATEGORIES,
        PERMISSIONS.READ_UNITS_OF_MEASURE,
      ],
    },
    {
      label: 'Organización',
      icon: <EngineeringIcon />,
      menuKey: 'organizacion',
      submenu: [
        {
          label: 'Usuarios',
          icon: <PeopleAltIcon />,
          path: ROUTES.USERS,
          permission: PERMISSIONS.READ_USERS,
        },
        {
          label: 'Áreas',
          icon: <BusinessIcon />,
          path: ROUTES.AREAS,
          permission: PERMISSIONS.READ_AREAS,
        },
        {
          label: 'Cargos',
          icon: <WorkIcon />,
          path: ROUTES.CARGOS,
          permission: PERMISSIONS.READ_CARGOS,
        },
      ],
      permissions: [
        PERMISSIONS.READ_USERS,
        PERMISSIONS.READ_AREAS,
        PERMISSIONS.READ_CARGOS,
      ],
    },
    {
      label: 'Seguridad',
      icon: <SecurityIcon />,
      menuKey: 'configuracion',
      submenu: [
        {
          label: 'Roles',
          icon: <AdminPanelSettingsIcon />,
          path: ROUTES.ROLES,
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
      ],
      permissions: [
        PERMISSIONS.READ_ROLES,
        PERMISSIONS.READ_PERMISSIONS,
        PERMISSIONS.READ_AUDIT_LOGS,
        PERMISSIONS.READ_SESSION_LOGS,
      ],
    },
  ];

  const getItemStyles = (active: boolean) => ({
    mx: 0.50,
    my: 0.5,
    borderRadius: '8px',
    py: 0.9,
    transition: 'all 0.2s ease',
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
      ? '#FFFFFF'
      : 'rgba(255, 255, 255, 0.7)',
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
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateX(4px)',
    },
    '& .MuiListItemIcon-root': {
      color: active
        ? '#FFFFFF'
        : 'rgba(255, 255, 255, 0.7)',
      minWidth: 36,
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
        background: SIDEBAR_GRADIENT,
      }}
    >
      {/* Hamburger Button - Only on Desktop */}
      {!isMobile && onToggleCollapse && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
            p: 1.5,
            px: collapsed ? 1.5 : 2,
          }}
        >
          <Tooltip title={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'} placement="right">
            <IconButton
              onClick={onToggleCollapse}
              sx={{
                color: isDark ? neonColors.primary.main : neonColors.primary.dark,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: alpha(neonColors.primary.main, isDark ? 0.2 : 0.1),
                  transform: 'scale(1.1)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Logo Container */}
      {!collapsed && (
        <Box
          sx={{
            p: 1.5,
            m: 1.5,
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            boxShadow: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: isDark
                ? `0 10px 30px ${alpha(neonColors.primary.main, 0.2)}, 0 0 20px ${alpha(neonAccents.vividPurple, 0.15)}`
                : '0 12px 25px -5px rgba(0, 0, 0, 0.2)',
              transform: 'translateY(-1.5px)',
            },
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="High Solutions Logo"
            sx={{
              width: '100%',
              maxWidth: 130,
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
      )}

      {/* Navigation List */}
      <List 
        sx={{ 
          px: 1, 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            marginTop: '8px',
            marginBottom: '8px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? alpha(neonColors.primary.main, 0.2) : 'rgba(0, 0, 0, 0.1)',
            borderRadius: '10px',
            transition: 'background 0.3s ease',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: isDark ? alpha(neonColors.primary.main, 0.4) : 'rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        {navItems.map((item, index) => {
          // Check permissions: single permission or array of permissions (any match)
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }
          if (item.permissions && !item.permissions.some(p => hasPermission(p))) {
            return null;
          }

          if (item.submenu) {
            const menuKey = (item.menuKey || item.label.toLowerCase()) as keyof typeof menuOpen;
            const isMenuOpen = menuOpen[menuKey];
            const siblingPaths = item.submenu.map(sub => sub.path);
            const isSubChildActive = item.submenu.some((sub) => isActive(sub.path, siblingPaths));

            return (
              <React.Fragment key={index}>
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <Tooltip title={collapsed ? item.label : ''} placement="right">
                    <ListItemButton
                      onClick={() => handleMenuClick(menuKey)}
                      sx={{
                        ...getItemStyles(isSubChildActive),
                        justifyContent: collapsed ? 'center' : 'flex-start',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36 }}>{item.icon}</ListItemIcon>
                      {!collapsed && <ListItemText primary={item.label} />}
                      {!collapsed && (isMenuOpen ? <ExpandLess sx={{ fontSize: '1.2rem' }} /> : <ExpandMore sx={{ fontSize: '1.2rem' }} />)}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
                <Collapse in={isMenuOpen && !collapsed} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ mb: 0.25 }}>
                    {item.submenu.map((subitem, subindex) => {
                      if (subitem.permission && !hasPermission(subitem.permission)) {
                        return null;
                      }

                      const active = isActive(subitem.path, siblingPaths);
                      return (
                        <ListItem key={subindex} disablePadding>
                          <Tooltip title={collapsed ? subitem.label : ''} placement="right">
                            <ListItemButton
                              component={RouterLink}
                              to={subitem.path}
                              sx={{
                                ...getItemStyles(active),
                                pl: 2.5,
                                py: 0.3,
                                mx: 1.25,
                                '&:hover': {
                                  ...getItemStyles(active)['&:hover'],
                                  transform: 'translateX(3px)',
                                }
                              }}
                            >
                              {subitem.icon && (
                                <ListItemIcon sx={{ minWidth: 30, '& .MuiSvgIcon-root': { fontSize: '1.05rem' } }}>
                                  {subitem.icon}
                                </ListItemIcon>
                              )}
                              <ListItemText 
                                primary={subitem.label} 
                                primaryTypographyProps={{ 
                                  sx: { 
                                    fontSize: '0.8rem',
                                    fontWeight: active ? 600 : 400
                                  } 
                                }} 
                              />
                            </ListItemButton>
                          </Tooltip>
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
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path!}
                  sx={{
                    ...getItemStyles(active),
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36 }}>{item.icon}</ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Session Status Card */}
      {!collapsed && (
        <Box sx={{ mt: 'auto', p: 2, mb: 1 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'none',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFFFFF' }}>
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
      )}
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
            background: SIDEBAR_GRADIENT,
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
        width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
        flexShrink: 0,
        borderRight: `1px solid ${isDark
          ? alpha(neonAccents.vividPurple, 0.2)
          : theme.palette.divider}`,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: SIDEBAR_GRADIENT,
        transition: 'width 0.3s ease',
      }}
    >
      {content}
    </Box>
  );
};
