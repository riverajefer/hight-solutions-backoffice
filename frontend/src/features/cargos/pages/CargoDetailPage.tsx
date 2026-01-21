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
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useCargo } from '../hooks/useCargos';

const CargoDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: cargo, isLoading, error } = useCargo(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !cargo) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Cargo no encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={cargo.name}
        breadcrumbs={[
          { label: 'Cargos', path: '/cargos' },
          { label: cargo.name },
        ]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Información del Cargo</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/cargos/${id}/edit`)}
                >
                  Editar
                </Button>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nombre
                  </Typography>
                  <Typography variant="body1">{cargo.name}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripción
                  </Typography>
                  <Typography variant="body1">
                    {cargo.description || 'Sin descripción'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Área
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      icon={<BusinessIcon />}
                      label={cargo.area?.name || 'Sin área'}
                      size="small"
                      color="secondary"
                      onClick={() => cargo.area?.id && navigate(`/areas/${cargo.area.id}`)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={cargo.isActive ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={cargo.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Usuarios asignados
                  </Typography>
                  <Typography variant="body1">{cargo.usersCount || 0}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de creación
                  </Typography>
                  <Typography variant="body1">
                    {new Date(cargo.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CargoDetailPage;
