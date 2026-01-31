import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';

const CommercialChannelDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: commercialChannel, isLoading, error } = useQuery({
    queryKey: ['commercialChannel', id],
    queryFn: () => commercialChannelsApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !commercialChannel) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Canal de venta no encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={commercialChannel.name}
        breadcrumbs={[
          { label: 'Canales de Venta', path: '/commercial-channels' },
          { label: commercialChannel.name },
        ]}
      />

      <Card sx={{ maxWidth: 800 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Información del Canal de Venta</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/commercial-channels/${id}/edit`)}
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
              <Typography variant="body1">{commercialChannel.name}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Descripción
              </Typography>
              <Typography variant="body1">
                {commercialChannel.description || 'Sin descripción'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Fecha de Creación
              </Typography>
              <Typography variant="body1">
                {new Date(commercialChannel.createdAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Última Actualización
              </Typography>
              <Typography variant="body1">
                {new Date(commercialChannel.updatedAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CommercialChannelDetailPage;
