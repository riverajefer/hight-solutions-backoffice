import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ShieldIcon from '@mui/icons-material/Shield';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { usersApi, rolesApi, permissionsApi, clientsApi, suppliersApi, areasApi, cargosApi, auditLogsApi, sessionLogsApi } from '../../../api';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useAuthStore } from '../../../store/authStore';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  neonColor?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Colores neón para cada categoría
const NEON_COLORS = {
  general: '#00FFFF',      // Cyan neón
  talent: '#00D9FF',       // Azul neón
  business: '#0FFF50',     // Verde neón
  security: '#FF6B00',     // Naranja neón
  audit: '#BC13FE',        // Púrpura neón
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, neonColor, action }) => {
  const hoverColor = neonColor || color;

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(26, 26, 46, 0.6) 0%, rgba(22, 33, 62, 1) 100%)'
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        border: '2px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(139, 92, 246, 0.1)'
            : 'rgba(46, 176, 196, 0.1)',
        borderRadius: '20px',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        '&:hover': {
          transform: 'translateY(-8px)',
          borderColor: hoverColor,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? `0 0 20px ${hoverColor}30, 0 0 40px ${hoverColor}15, 0 20px 50px -10px rgba(0,0,0,0.5)`
              : `0 0 15px ${hoverColor}25, 0 0 30px ${hoverColor}12, 0 20px 50px -10px rgba(0,0,0,0.1)`,
          '& .stat-icon-container': {
            transform: 'scale(1.1) rotate(5deg)',
            backgroundColor: hoverColor,
            color: '#fff',
            boxShadow: `0 0 15px ${hoverColor}50, 0 0 30px ${hoverColor}25`,
          },
          '& .stat-action-btn': {
            backgroundColor: `${hoverColor}20`,
            color: hoverColor,
            transform: 'translateY(-2px)',
            boxShadow: `0 0 12px ${hoverColor}25`,
          },
          '& .stat-decorative': {
            background: `radial-gradient(circle, ${hoverColor}20 0%, transparent 70%)`,
          }
        },
      }}
    >
      {/* Decorative background element */}
      <Box
        className="stat-decorative"
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          zIndex: 0,
          transition: 'all 0.3s ease',
        }}
      />

    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box
          className="stat-icon-container"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '16px',
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : `${color}10`,
            color: color,
            transition: 'all 0.4s ease',
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 28 } })}
        </Box>
        <Box textAlign="right">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontSize: '2rem',
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.7rem',
              mt: 0.5,
              display: 'block'
            }}
          >
            Total Registros
          </Typography>
        </Box>
      </Box>

      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          mb: 'auto',
          fontSize: '1.1rem',
        }}
      >
        {title}
      </Typography>

      {action && (
        <Button
          className="stat-action-btn"
          size="medium"
          onClick={action.onClick}
          fullWidth
          variant="text"
          sx={{
            mt: 3,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: color,
            borderRadius: '12px',
            py: 1,
            transition: 'all 0.3s ease',
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : `${color}08`,
          }}
        >
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`dashboard-tabpanel-${index}`}
    aria-labelledby={`dashboard-tab-${index}`}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

/**
 * Página del dashboard principal
 */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  const [currentTab, setCurrentTab] = React.useState(0);

  // Obtener todos los datos del store para debugging
  const authState = useAuthStore.getState();
  
  // Logs de información del usuario y permisos
  console.log('=== DASHBOARD - INFORMACIÓN DEL USUARIO ===');
  console.log('Usuario completo:', user);
  console.log('Permisos del usuario:', authState.permissions);
  console.log('Total de permisos:', authState.permissions.length);
  console.log('¿Está autenticado?:', authState.isAuthenticated);
  console.log('===========================================');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_USERS)) return [];
      return usersApi.getAll();
    },
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_ROLES)) return [];
      return rolesApi.getAll();
    },
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_PERMISSIONS)) return [];
      return permissionsApi.getAll();
    },
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_CLIENTS)) return [];
      return clientsApi.getAll();
    },
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_SUPPLIERS)) return [];
      return suppliersApi.getAll();
    },
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_AREAS)) return [];
      return areasApi.getAll();
    },
  });

  const { data: cargos = [], isLoading: cargosLoading } = useQuery({
    queryKey: ['cargos'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_CARGOS)) return [];
      return cargosApi.getAll();
    },
  });

  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_AUDIT_LOGS)) return { data: [], total: 0 };
      return auditLogsApi.getAll({ page: 1, limit: 10 });
    },
  });

  const { data: sessionLogsData, isLoading: sessionLogsLoading } = useQuery({
    queryKey: ['session-logs'],
    queryFn: async () => {
      if (!hasPermission(PERMISSIONS.READ_SESSION_LOGS)) return { data: [], meta: { total: 0 } };
      return sessionLogsApi.getAll({ page: 1, limit: 10 });
    },
  });

  const isLoading = usersLoading || rolesLoading || permissionsLoading || clientsLoading || suppliersLoading || areasLoading || cargosLoading || auditLogsLoading || sessionLogsLoading;
  
  // Logs de verificación de permisos específicos
  console.log('=== VERIFICACIÓN DE PERMISOS ESPECÍFICOS ===');
  console.log(`${PERMISSIONS.READ_USERS}:`, hasPermission(PERMISSIONS.READ_USERS));
  console.log(`${PERMISSIONS.READ_ROLES}:`, hasPermission(PERMISSIONS.READ_ROLES));
  console.log(`${PERMISSIONS.READ_PERMISSIONS}:`, hasPermission(PERMISSIONS.READ_PERMISSIONS));
  console.log(`${PERMISSIONS.CREATE_USERS}:`, hasPermission(PERMISSIONS.CREATE_USERS));
  console.log(`${PERMISSIONS.CREATE_ROLES}:`, hasPermission(PERMISSIONS.CREATE_ROLES));
  console.log('===========================================');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const usersCount = Array.isArray(users) ? users.length : 0;
  const rolesCount = Array.isArray(roles) ? roles.length : 0;
  const permissionsCount = Array.isArray(permissions) ? permissions.length : 0;
  const clientsCount = Array.isArray(clients) ? clients.length : 0;
  const suppliersCount = Array.isArray(suppliers) ? suppliers.length : 0;
  const areasCount = Array.isArray(areas) ? areas.length : 0;
  const cargosCount = Array.isArray(cargos) ? cargos.length : 0;
  const auditLogsCount = auditLogsData?.total || 0;
  const sessionLogsCount = sessionLogsData?.meta?.total || 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <PageHeader
        title={`Bienvenido ${user?.firstName || 'Usuario'}`}
        subtitle="Panel de control"
      />

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{
            sx: {
              height: 3,
              borderRadius: '3px 3px 0 0',
              backgroundColor:
                currentTab === 0 ? NEON_COLORS.general :
                currentTab === 1 ? NEON_COLORS.talent :
                currentTab === 2 ? NEON_COLORS.business :
                currentTab === 3 ? NEON_COLORS.security :
                NEON_COLORS.audit,
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? `0 0 20px ${
                      currentTab === 0 ? NEON_COLORS.general :
                      currentTab === 1 ? NEON_COLORS.talent :
                      currentTab === 2 ? NEON_COLORS.business :
                      currentTab === 3 ? NEON_COLORS.security :
                      NEON_COLORS.audit
                    }80`
                  : 'none',
            }
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minHeight: 56,
              px: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
              }
            },
            '& .Mui-selected': {
              fontWeight: 700,
            },
            '& .MuiTab-root:nth-of-type(1).Mui-selected': {
              color: NEON_COLORS.general,
            },
            '& .MuiTab-root:nth-of-type(2).Mui-selected': {
              color: NEON_COLORS.talent,
            },
            '& .MuiTab-root:nth-of-type(3).Mui-selected': {
              color: NEON_COLORS.business,
            },
            '& .MuiTab-root:nth-of-type(4).Mui-selected': {
              color: NEON_COLORS.security,
            },
            '& .MuiTab-root:nth-of-type(5).Mui-selected': {
              color: NEON_COLORS.audit,
            },
          }}
        >
          <Tab
            icon={<DashboardIcon />}
            iconPosition="start"
            label="Vista General"
          />
          <Tab
            icon={<GroupsIcon />}
            iconPosition="start"
            label="Gestión de Talento"
          />
          <Tab
            icon={<HandshakeIcon />}
            iconPosition="start"
            label="Negocios"
          />
          <Tab
            icon={<ShieldIcon />}
            iconPosition="start"
            label="Seguridad"
          />
          <Tab
            icon={<AssessmentIcon />}
            iconPosition="start"
            label="Auditoría"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Vista General */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={2.5}>
          {hasPermission(PERMISSIONS.READ_USERS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Usuarios"
                value={usersCount}
                icon={<PeopleIcon />}
                color="#5B9FED"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver usuarios',
                  onClick: () => navigate(ROUTES.USERS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_AREAS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Áreas"
                value={areasCount}
                icon={<BusinessIcon />}
                color="#2DD4BF"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver áreas',
                  onClick: () => navigate(ROUTES.AREAS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_CARGOS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Cargos"
                value={cargosCount}
                icon={<WorkIcon />}
                color="#F472B6"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver cargos',
                  onClick: () => navigate(ROUTES.CARGOS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_CLIENTS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Clientes"
                value={clientsCount}
                icon={<PeopleAltIcon />}
                color="#38BDF8"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver clientes',
                  onClick: () => navigate(ROUTES.CLIENTS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_SUPPLIERS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Proveedores"
                value={suppliersCount}
                icon={<LocalShippingIcon />}
                color="#A78BFA"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver proveedores',
                  onClick: () => navigate(ROUTES.SUPPLIERS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_ROLES) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Roles"
                value={rolesCount}
                icon={<SecurityIcon />}
                color="#FB923C"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver roles',
                  onClick: () => navigate(ROUTES.ROLES),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_PERMISSIONS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Permisos"
                value={permissionsCount}
                icon={<VerifiedUserIcon />}
                color="#4ADE80"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver permisos',
                  onClick: () => navigate(ROUTES.PERMISSIONS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_AUDIT_LOGS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Logs de Auditoría"
                value={auditLogsCount}
                icon={<HistoryIcon />}
                color="#A1A1AA"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver logs',
                  onClick: () => navigate(ROUTES.AUDIT_LOGS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_SESSION_LOGS) && (
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <StatCard
                title="Historial de Sesiones"
                value={sessionLogsCount}
                icon={<LoginIcon />}
                color="#94A3B8"
                neonColor={NEON_COLORS.general}
                action={{
                  label: 'Ver historial',
                  onClick: () => navigate(ROUTES.SESSION_LOGS),
                }}
              />
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Tab 1: Gestión de Talento */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={2.5}>
          {hasPermission(PERMISSIONS.READ_USERS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Usuarios"
                value={usersCount}
                icon={<PeopleIcon />}
                color="#5B9FED"
                neonColor={NEON_COLORS.talent}
                action={{
                  label: 'Ver usuarios',
                  onClick: () => navigate(ROUTES.USERS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_AREAS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Áreas"
                value={areasCount}
                icon={<BusinessIcon />}
                color="#2DD4BF"
                neonColor={NEON_COLORS.talent}
                action={{
                  label: 'Ver áreas',
                  onClick: () => navigate(ROUTES.AREAS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_CARGOS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Cargos"
                value={cargosCount}
                icon={<WorkIcon />}
                color="#F472B6"
                neonColor={NEON_COLORS.talent}
                action={{
                  label: 'Ver cargos',
                  onClick: () => navigate(ROUTES.CARGOS),
                }}
              />
            </Grid>
          )}
        </Grid>

        {/* Acciones Rápidas - Talento */}
        <Box mt={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Acciones Rápidas
          </Typography>
          <Grid container spacing={2}>
            {hasPermission(PERMISSIONS.CREATE_USERS) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.USERS_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#5B9FED',
                      color: '#5B9FED',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(91, 159, 237, 0.15)',
                      background: 'rgba(91, 159, 237, 0.05)',
                    },
                  }}
                >
                  Crear Usuario
                </Button>
              </Grid>
            )}
            {hasPermission(PERMISSIONS.CREATE_AREAS) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.AREAS_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#2DD4BF',
                      color: '#2DD4BF',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(45, 212, 191, 0.15)',
                      background: 'rgba(45, 212, 191, 0.05)',
                    },
                  }}
                >
                  Crear Área
                </Button>
              </Grid>
            )}
            {hasPermission(PERMISSIONS.CREATE_CARGOS) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.CARGOS_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#F472B6',
                      color: '#F472B6',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(244, 114, 182, 0.15)',
                      background: 'rgba(244, 114, 182, 0.05)',
                    },
                  }}
                >
                  Crear Cargo
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 2: Negocios */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={2.5}>
          {hasPermission(PERMISSIONS.READ_CLIENTS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Clientes"
                value={clientsCount}
                icon={<PeopleAltIcon />}
                color="#38BDF8"
                neonColor={NEON_COLORS.business}
                action={{
                  label: 'Ver clientes',
                  onClick: () => navigate(ROUTES.CLIENTS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_SUPPLIERS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Proveedores"
                value={suppliersCount}
                icon={<LocalShippingIcon />}
                color="#A78BFA"
                neonColor={NEON_COLORS.business}
                action={{
                  label: 'Ver proveedores',
                  onClick: () => navigate(ROUTES.SUPPLIERS),
                }}
              />
            </Grid>
          )}
        </Grid>

        {/* Acciones Rápidas - Negocios */}
        <Box mt={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Acciones Rápidas
          </Typography>
          <Grid container spacing={2}>
            {hasPermission(PERMISSIONS.CREATE_CLIENTS) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.CLIENTS_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#38BDF8',
                      color: '#38BDF8',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(56, 189, 248, 0.15)',
                      background: 'rgba(56, 189, 248, 0.05)',
                    },
                  }}
                >
                  Crear Cliente
                </Button>
              </Grid>
            )}
            {hasPermission(PERMISSIONS.CREATE_SUPPLIERS) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.SUPPLIERS_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#A78BFA',
                      color: '#A78BFA',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(167, 139, 250, 0.15)',
                      background: 'rgba(167, 139, 250, 0.05)',
                    },
                  }}
                >
                  Crear Proveedor
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 3: Seguridad */}
      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={2.5}>
          {hasPermission(PERMISSIONS.READ_ROLES) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Roles"
                value={rolesCount}
                icon={<SecurityIcon />}
                color="#FB923C"
                neonColor={NEON_COLORS.security}
                action={{
                  label: 'Ver roles',
                  onClick: () => navigate(ROUTES.ROLES),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_PERMISSIONS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Permisos"
                value={permissionsCount}
                icon={<VerifiedUserIcon />}
                color="#4ADE80"
                neonColor={NEON_COLORS.security}
                action={{
                  label: 'Ver permisos',
                  onClick: () => navigate(ROUTES.PERMISSIONS),
                }}
              />
            </Grid>
          )}
        </Grid>

        {/* Acciones Rápidas - Seguridad */}
        <Box mt={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Acciones Rápidas
          </Typography>
          <Grid container spacing={2}>
            {hasPermission(PERMISSIONS.CREATE_ROLES) && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(ROUTES.ROLES_CREATE)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: '#FB923C',
                      color: '#FB923C',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(251, 146, 60, 0.15)',
                      background: 'rgba(251, 146, 60, 0.05)',
                    },
                  }}
                >
                  Crear Rol
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 4: Auditoría */}
      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={2.5}>
          {hasPermission(PERMISSIONS.READ_AUDIT_LOGS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Logs de Auditoría"
                value={auditLogsCount}
                icon={<HistoryIcon />}
                color="#A1A1AA"
                neonColor={NEON_COLORS.audit}
                action={{
                  label: 'Ver logs',
                  onClick: () => navigate(ROUTES.AUDIT_LOGS),
                }}
              />
            </Grid>
          )}
          {hasPermission(PERMISSIONS.READ_SESSION_LOGS) && (
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Historial de Sesiones"
                value={sessionLogsCount}
                icon={<LoginIcon />}
                color="#94A3B8"
                neonColor={NEON_COLORS.audit}
                action={{
                  label: 'Ver historial',
                  onClick: () => navigate(ROUTES.SESSION_LOGS),
                }}
              />
            </Grid>
          )}
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default DashboardPage;
