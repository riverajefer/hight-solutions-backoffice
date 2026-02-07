import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useCommercialChannels } from '../hooks/useCommercialChannels';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import { CreateCommercialChannelDto, UpdateCommercialChannelDto } from '../../../types/commercialChannel.types';
import { useQuery } from '@tanstack/react-query';

const commercialChannelSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type CommercialChannelFormData = z.infer<typeof commercialChannelSchema>;

const CommercialChannelFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;

  // Query para obtener el canal de venta si es edición
  const { data: commercialChannel, isLoading: isLoadingChannel } = useQuery({
    queryKey: ['commercialChannel', id],
    queryFn: () => commercialChannelsApi.getById(id!),
    enabled: !!id && isEdit,
  });

  const { createMutation, updateMutation } = useCommercialChannels();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommercialChannelFormData>({
    resolver: zodResolver(commercialChannelSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (commercialChannel && isEdit) {
      reset({
        name: commercialChannel.name,
        description: commercialChannel.description || '',
      });
    }
  }, [commercialChannel, isEdit, reset]);

  const onSubmit = async (data: CommercialChannelFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: data as UpdateCommercialChannelDto,
        });
      } else {
        await createMutation.mutateAsync(data as CreateCommercialChannelDto);
      }
      navigate('/commercial-channels');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar canal de venta';
      setError(message);
    }
  };

  if (isEdit && isLoadingChannel) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Canal de Venta' : 'Nuevo Canal de Venta'}
        breadcrumbs={[
          { label: 'Canales de Venta', path: '/commercial-channels' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/commercial-channels')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CommercialChannelFormPage;
