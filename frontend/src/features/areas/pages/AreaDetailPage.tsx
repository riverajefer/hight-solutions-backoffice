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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import WorkIcon from '@mui/icons-material/Work';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useArea } from '../hooks/useAreas';

const AreaDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: area, isLoading, error } = useArea(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !area) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Área no encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={area.name}
        breadcrumbs={[
          { label: 'Áreas', path: '/areas' },
          { label: area.name },
        ]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Información del Área</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/areas/${id}/edit`)}
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
                  <Typography variant="body1">{area.name}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripción
                  </Typography>
                  <Typography variant="body1">
                    {area.description || 'Sin descripción'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={area.isActive ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={area.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de creación
                  </Typography>
                  <Typography variant="body1">
                    {new Date(area.createdAt).toLocaleDateString('es-ES', {
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

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Cargos ({area.cargos?.length || 0})
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/cargos/new', { state: { areaId: area.id } })}
                >
                  Nuevo Cargo
                </Button>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {area.cargos && area.cargos.length > 0 ? (
                <List>
                  {area.cargos.map((cargo) => (
                    <ListItem
                      key={cargo.id}
                      secondaryAction={
                        <Chip
                          label={`${cargo.usersCount || 0} usuarios`}
                          size="small"
                          variant="outlined"
                        />
                      }
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1,
                      }}
                      onClick={() => navigate(`/cargos/${cargo.id}`)}
                    >
                      <ListItemIcon>
                        <WorkIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={cargo.name}
                        secondary={cargo.description}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No hay cargos registrados en esta área
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AreaDetailPage;
