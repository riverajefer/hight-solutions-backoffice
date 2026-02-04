import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useClient } from '../hooks/useClients';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';

const ClientDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthStore();
  const { data: client, isLoading, error } = useClient(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !client) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Cliente no encontrado</Typography>
      </Box>
    );
  }

  const InfoItem = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
  }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
      <Box sx={{ color: 'text.secondary', mt: 0.5 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" component="div">{value || '-'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title={client.name}
        breadcrumbs={[
          { label: 'Clientes', path: '/clients' },
          { label: client.name },
        ]}
      />

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Información del Cliente</Typography>
                {hasPermission(PERMISSIONS.UPDATE_CLIENTS) && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/clients/${id}/edit`)}
                  >
                    Editar
                  </Button>
                )}
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <InfoItem
                    icon={<BusinessIcon fontSize="small" />}
                    label="Nombre"
                    value={client.name}
                  />

                  <InfoItem
                    icon={<PersonIcon fontSize="small" />}
                    label="Encargado / Gerente"
                    value={client.manager || 'No especificado'}
                  />

                  <InfoItem
                    icon={<EmailIcon fontSize="small" />}
                    label="Email"
                    value={client.email}
                  />

                  <InfoItem
                    icon={<PhoneIcon fontSize="small" />}
                    label="Teléfono"
                    value={client.phone || 'No especificado'}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <InfoItem
                    icon={<LocationOnIcon fontSize="small" />}
                    label="Dirección"
                    value={client.address || 'No especificada'}
                  />

                  <InfoItem
                    icon={<LocationOnIcon fontSize="small" />}
                    label="Ubicación"
                    value={
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={client.city?.name || 'Sin ciudad'}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={client.department?.name || 'Sin departamento'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    }
                  />

                  <InfoItem
                    icon={<BadgeIcon fontSize="small" />}
                    label="Tipo de Persona"
                    value={
                      <Chip
                        label={client.personType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}
                        size="small"
                        color={client.personType === 'EMPRESA' ? 'primary' : 'default'}
                      />
                    }
                  />

                  {client.personType === 'EMPRESA' && (
                    <InfoItem
                      icon={<BadgeIcon fontSize="small" />}
                      label="NIT"
                      value={client.nit || 'No especificado'}
                    />
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Estado Actual
                </Typography>
                <Box mt={0.5}>
                  <Chip
                    label={client.isActive ? 'Activo' : 'Inactivo'}
                    size="small"
                    color={client.isActive ? 'success' : 'default'}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Fecha de Creación
                </Typography>
                <Typography variant="body2">
                  {new Date(client.createdAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Última Actualización
                </Typography>
                <Typography variant="body2">
                  {new Date(client.updatedAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientDetailPage;
