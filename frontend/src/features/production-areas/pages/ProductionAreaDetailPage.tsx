import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useProductionArea } from '../hooks/useProductionAreas';

const ProductionAreaDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: productionArea, isLoading, error } = useProductionArea(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !productionArea) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Área de producción no encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={productionArea.name}
        breadcrumbs={[
          { label: 'Áreas de Producción', path: '/production-areas' },
          { label: productionArea.name },
        ]}
      />

      <Card sx={{ maxWidth: 800 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Información del Área de Producción</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/production-areas/${id}/edit`)}
            >
              Editar
            </Button>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Nombre
              </Typography>
              <Typography variant="body1">{productionArea.name}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Descripción
              </Typography>
              <Typography variant="body1">
                {productionArea.description || 'Sin descripción'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Estado
              </Typography>
              <Chip
                label={productionArea.isActive ? 'Activo' : 'Inactivo'}
                color={productionArea.isActive ? 'success' : 'default'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Fecha de creación
              </Typography>
              <Typography variant="body2">
                {new Date(productionArea.createdAt).toLocaleString('es-CO')}
              </Typography>
            </Box>

            {productionArea.updatedAt !== productionArea.createdAt && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Última actualización
                </Typography>
                <Typography variant="body2">
                  {new Date(productionArea.updatedAt).toLocaleString('es-CO')}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProductionAreaDetailPage;
