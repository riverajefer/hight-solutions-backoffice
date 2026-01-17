import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { usersApi, rolesApi, permissionsApi } from '../../../api';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useAuthStore } from '../../../store/authStore';
import { ROUTES, PERMISSIONS } from '../../../utils/constants';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, action }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 50,
            height: 50,
            borderRadius: '8px',
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {value}
      </Typography>
      <Typography color="textSecondary" variant="body2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {action && (
        <Button size="small" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);

/**
 * Página del dashboard principal
 */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  
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

  const isLoading = usersLoading || rolesLoading || permissionsLoading;
  
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

  return (
    <Box>
      <PageHeader
        title={`Bienvenido, ${user?.firstName || 'Usuario'}`}
        subtitle="Panel de control del backoffice"
      />

      <Grid container spacing={3}>
        {hasPermission(PERMISSIONS.READ_USERS) && (
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Usuarios"
              value={usersCount}
              icon={<PeopleIcon />}
              color="#1976d2"
              action={{
                label: 'Ver usuarios',
                onClick: () => navigate(ROUTES.USERS),
              }}
            />
          </Grid>
        )}

        {hasPermission(PERMISSIONS.READ_ROLES) && (
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Roles"
              value={rolesCount}
              icon={<SecurityIcon />}
              color="#f57c00"
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
              color="#388e3c"
              action={{
                label: 'Ver permisos',
                onClick: () => navigate(ROUTES.PERMISSIONS),
              }}
            />
          </Grid>
        )}
      </Grid>

      {/* Quick Actions */}
      <Box mt={4}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Acciones Rápidas
        </Typography>
        <Grid container spacing={2}>
          {hasPermission(PERMISSIONS.CREATE_USERS) && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate(ROUTES.USERS_CREATE)}
              >
                Crear Usuario
              </Button>
            </Grid>
          )}
          {hasPermission(PERMISSIONS.CREATE_ROLES) && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate(ROUTES.ROLES_CREATE)}
              >
                Crear Rol
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;
